/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import express from 'express';

const app = express();
app.use(express.json({ limit: process?.env?.API_PAYLOAD_MAX_SIZE || '7mb' }));

// CORS: only allow requests from the local Electron app
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-app-proxy');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const PORT = process?.env?.API_BACKEND_PORT || 5000;
const API_BACKEND_HOST = process?.env?.API_BACKEND_HOST || '127.0.0.1';

const SUPPORTED_PROVIDERS = new Set(['openai', 'anthropic', 'google']);
const REQUEST_TIMEOUT_MIN_MS = 1000;
const REQUEST_TIMEOUT_MAX_MS = 120000;
const RATE_LIMIT_MIN_RPM = 1;
const RATE_LIMIT_MAX_RPM = 2000;

const llmSettings = {
  provider: process?.env?.LLM_PROVIDER || '',
  model: process?.env?.LLM_MODEL || '',
  apiKey: process?.env?.LLM_API_KEY || '',
  rateLimitPerMinute: Number.parseInt(process?.env?.LLM_RATE_LIMIT_PER_MINUTE || '60', 10),
  timeoutMs: Number.parseInt(process?.env?.LLM_TIMEOUT_MS || '30000', 10),
};

const rateLimitBuckets = new Map();

function sanitizeSettings(settings) {
  return {
    provider: settings.provider,
    model: settings.model,
    apiKeyConfigured: Boolean(settings.apiKey),
    rateLimitPerMinute: settings.rateLimitPerMinute,
    timeoutMs: settings.timeoutMs,
  };
}

function makeError(field, message) {
  return { field, message };
}

function normalizeProvider(provider) {
  return typeof provider === 'string' ? provider.trim().toLowerCase() : provider;
}

function validateSettingsPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [makeError('payload', 'Payload must be a JSON object.')];
  }

  const provider = normalizeProvider(payload.provider);
  if (typeof provider !== 'string' || !provider.length) {
    errors.push(makeError('provider', 'Provider is required.'));
  } else if (!SUPPORTED_PROVIDERS.has(provider)) {
    errors.push(makeError('provider', `Unsupported provider. Allowed: ${Array.from(SUPPORTED_PROVIDERS).join(', ')}.`));
  }

  if (typeof payload.model !== 'string' || !payload.model.trim().length) {
    errors.push(makeError('model', 'Model is required.'));
  }

  if (typeof payload.apiKey !== 'string' || !payload.apiKey.trim().length) {
    errors.push(makeError('key', 'API key is required.'));
  }

  if (!Number.isInteger(payload.rateLimitPerMinute)) {
    errors.push(makeError('rate-limit', 'rateLimitPerMinute must be an integer.'));
  } else if (payload.rateLimitPerMinute < RATE_LIMIT_MIN_RPM || payload.rateLimitPerMinute > RATE_LIMIT_MAX_RPM) {
    errors.push(
      makeError('rate-limit', `rateLimitPerMinute must be between ${RATE_LIMIT_MIN_RPM} and ${RATE_LIMIT_MAX_RPM}.`),
    );
  }

  if (!Number.isInteger(payload.timeoutMs)) {
    errors.push(makeError('timeout', 'timeoutMs must be an integer.'));
  } else if (payload.timeoutMs < REQUEST_TIMEOUT_MIN_MS || payload.timeoutMs > REQUEST_TIMEOUT_MAX_MS) {
    errors.push(makeError('timeout', `timeoutMs must be between ${REQUEST_TIMEOUT_MIN_MS} and ${REQUEST_TIMEOUT_MAX_MS}.`));
  }

  return errors;
}

function validateGeneratePayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [makeError('payload', 'Payload must be a JSON object.')];
  }

  const effectiveProvider = normalizeProvider(payload.provider || llmSettings.provider);
  const effectiveModel = typeof payload.model === 'string' && payload.model.trim().length ? payload.model.trim() : llmSettings.model;
  const effectiveApiKey = typeof payload.apiKey === 'string' && payload.apiKey.trim().length ? payload.apiKey.trim() : llmSettings.apiKey;
  const effectiveRateLimit = payload.rateLimitPerMinute ?? llmSettings.rateLimitPerMinute;
  const effectiveTimeout = payload.timeoutMs ?? llmSettings.timeoutMs;

  if (!effectiveProvider) {
    errors.push(makeError('provider', 'Provider is required (in payload or via /api/settings/llm).'));
  } else if (!SUPPORTED_PROVIDERS.has(effectiveProvider)) {
    errors.push(makeError('provider', `Unsupported provider. Allowed: ${Array.from(SUPPORTED_PROVIDERS).join(', ')}.`));
  }

  if (!effectiveModel) {
    errors.push(makeError('model', 'Model is required (in payload or via /api/settings/llm).'));
  }

  if (!effectiveApiKey) {
    errors.push(makeError('key', 'API key is required (in payload or via /api/settings/llm).'));
  }

  if (!Number.isInteger(effectiveRateLimit)) {
    errors.push(makeError('rate-limit', 'rateLimitPerMinute must be an integer.'));
  } else if (effectiveRateLimit < RATE_LIMIT_MIN_RPM || effectiveRateLimit > RATE_LIMIT_MAX_RPM) {
    errors.push(
      makeError('rate-limit', `rateLimitPerMinute must be between ${RATE_LIMIT_MIN_RPM} and ${RATE_LIMIT_MAX_RPM}.`),
    );
  }

  if (!Number.isInteger(effectiveTimeout)) {
    errors.push(makeError('timeout', 'timeoutMs must be an integer.'));
  } else if (effectiveTimeout < REQUEST_TIMEOUT_MIN_MS || effectiveTimeout > REQUEST_TIMEOUT_MAX_MS) {
    errors.push(makeError('timeout', `timeoutMs must be between ${REQUEST_TIMEOUT_MIN_MS} and ${REQUEST_TIMEOUT_MAX_MS}.`));
  }

  const hasPrompt = typeof payload.prompt === 'string' && payload.prompt.trim().length > 0;
  const hasMessages = Array.isArray(payload.messages) && payload.messages.length > 0;
  if (!hasPrompt && !hasMessages) {
    errors.push(makeError('payload', 'Either a non-empty prompt or messages array is required.'));
  }

  return {
    errors,
    effective: {
      provider: effectiveProvider,
      model: effectiveModel,
      apiKey: effectiveApiKey,
      rateLimitPerMinute: effectiveRateLimit,
      timeoutMs: effectiveTimeout,
    },
  };
}

function applyRateLimit(limitKey, rateLimitPerMinute) {
  const now = Date.now();
  const windowStart = now - 60000;
  const entries = rateLimitBuckets.get(limitKey) || [];
  const recentEntries = entries.filter((entry) => entry > windowStart);

  if (recentEntries.length >= rateLimitPerMinute) {
    const oldestWithinWindow = recentEntries[0];
    const retryAfterMs = Math.max(1000, 60000 - (now - oldestWithinWindow));
    return { allowed: false, retryAfterMs };
  }

  recentEntries.push(now);
  rateLimitBuckets.set(limitKey, recentEntries);
  return { allowed: true, retryAfterMs: 0 };
}

function withTimeout(timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeout),
  };
}

function toOpenAiMessages(payload) {
  if (Array.isArray(payload.messages) && payload.messages.length) {
    return payload.messages;
  }
  return [{ role: 'user', content: String(payload.prompt || '') }];
}

async function callProvider(effective, payload) {
  const { provider, model, apiKey, timeoutMs } = effective;
  const timeout = withTimeout(timeoutMs);

  try {
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: toOpenAiMessages(payload),
          temperature: payload.temperature,
          max_tokens: payload.maxTokens,
        }),
        signal: timeout.signal,
      });

      const data = await response.json();
      if (!response.ok) {
        return { status: response.status, data: { error: 'Provider request failed', provider, details: data } };
      }
      return { status: 200, data };
    }

    if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: toOpenAiMessages(payload),
          max_tokens: payload.maxTokens || 1024,
          temperature: payload.temperature,
        }),
        signal: timeout.signal,
      });

      const data = await response.json();
      if (!response.ok) {
        return { status: response.status, data: { error: 'Provider request failed', provider, details: data } };
      }
      return { status: 200, data };
    }

    if (provider === 'google') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: payload.prompt || JSON.stringify(payload.messages || []) }],
              },
            ],
            generationConfig: {
              temperature: payload.temperature,
              maxOutputTokens: payload.maxTokens,
            },
          }),
          signal: timeout.signal,
        },
      );

      const data = await response.json();
      if (!response.ok) {
        return { status: response.status, data: { error: 'Provider request failed', provider, details: data } };
      }
      return { status: 200, data };
    }

    return { status: 400, data: { error: `Unsupported provider: ${provider}` } };
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        status: 504,
        data: {
          error: 'Provider timeout',
          message: `Provider request exceeded timeoutMs=${timeoutMs}.`,
        },
      };
    }

    return {
      status: 502,
      data: {
        error: 'Provider communication error',
        message: error instanceof Error ? error.message : 'Unknown provider error',
      },
    };
  } finally {
    timeout.cleanup();
  }
}

app.get('/api/settings/llm', (req, res) => {
  res.status(200).json({ data: sanitizeSettings(llmSettings) });
});

app.post('/api/settings/llm', (req, res) => {
  const errors = validateSettingsPayload(req.body);
  if (errors.length) {
    return res.status(400).json({ error: 'Invalid settings payload', details: errors });
  }

  llmSettings.provider = normalizeProvider(req.body.provider);
  llmSettings.model = req.body.model.trim();
  llmSettings.apiKey = req.body.apiKey.trim();
  llmSettings.rateLimitPerMinute = req.body.rateLimitPerMinute;
  llmSettings.timeoutMs = req.body.timeoutMs;

  return res.status(200).json({
    message: 'LLM settings updated.',
    data: sanitizeSettings(llmSettings),
  });
});

app.post('/api/llm/generate', async (req, res) => {
  const { errors, effective } = validateGeneratePayload(req.body);
  if (errors.length) {
    return res.status(400).json({ error: 'Invalid generate payload', details: errors });
  }

  const limitKey = `${effective.provider}:${effective.model}`;
  const rateLimitResult = applyRateLimit(limitKey, effective.rateLimitPerMinute);
  if (!rateLimitResult.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      details: [makeError('rate-limit', `Too many requests. Retry in ${rateLimitResult.retryAfterMs}ms.`)],
      retryAfterMs: rateLimitResult.retryAfterMs,
    });
  }

  const providerResponse = await callProvider(effective, req.body);
  return res.status(providerResponse.status).json(providerResponse.data);
});

app.listen(PORT, API_BACKEND_HOST, () => {
  console.log(`LLM Backend listening at http://localhost:${PORT}`);
});
