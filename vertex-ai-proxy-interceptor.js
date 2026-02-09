
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 * 
 * This script is used to intercept fetch requests to Google Cloud AI APIs and 
 * proxy them to the local Node JS server backend server.
 */
(function(clientRegexPattern) {
  const originalFetch = window.fetch;
  const apiRegex = new RegExp(clientRegexPattern);

  console.log('[Vertex AI Proxy Shim] Initialized. Intercepting for Cloud AI API URLs');
  window.fetch = async function(url, options) {
    const inputUrl = typeof url === 'string' ? url : (url instanceof Request ? url.url : null);
    const normalizedUrl = (typeof inputUrl === 'string') ? inputUrl.split('?')[0] : null;
    // Check if the URL matches the patterns of Vertex AI APIs.
    if (normalizedUrl && apiRegex.test(normalizedUrl)) {
      console.log('[Vertex AI Proxy Shim] Intercepted Vertex API request:', normalizedUrl);
      // Prepare the request details to send to the local Node.js backend.
      const requestDetails = {
        originalUrl: normalizedUrl,
        headers: options?.headers ? Object.fromEntries(new Headers(options.headers).entries()) : {},
        method: options?.method || 'POST',
        // Serialize headers from Headers object or plain object (these should include request auth headers.
        // Pass the body as is. The Node backend will handle parsing.
        body: options?.body,
      };

      try {
        // Make a fetch request to the local Node JS proxy endpoint.
        const proxyFetchOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Add a custom header to easily identify these proxied requests on the Node.js backend.
            'X-App-Proxy': 'local-vertex-ai-app'
          },
          body: JSON.stringify(requestDetails),
        };

        console.log('[Vertex AI Proxy Shim] Fetching from local Node.js backend: /api-proxy');
        const proxyResponse = await fetch('/api-proxy', proxyFetchOptions);

        if (proxyResponse.status === 401) {
            console.error('[Vertex Proxy Shim] Local Node.js backend returned 401. Authentication may be needed.');
            return proxyResponse; // Return the proxy's 401 response.
        }


        if (!proxyResponse.ok) {
          console.error(`[Vertex Proxy Shim] Proxy request to /api-proxy failed with status ${proxyResponse.status}: ${proxyResponse.statusText}`);
          return proxyResponse; // Propagate other non-ok responses from the proxy.
        }

        return proxyResponse;
      } catch (error) {
        console.error('[Vertex AI Proxy Shim] Error fetching from local Node.js backend:', error);
        return new Response(JSON.stringify({
            error: 'Proxying failed',
            details: error.message, name: error.name,
            proxiedUrl: inputUrl
          }),
          {
            status: 503, // Service Unavailable
            statusText: 'Local Proxy Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          }
        );
      }
    } else {
      // If the URL doesn't match the Vertex API regex, use the original window.fetch.
      return originalFetch.apply(this, arguments);
    }
  }
})("^https:\/\/aiplatform\.googleapis\.com\/(?<version>[^/]+)\/publishers\/google\/models\/(?<model>[^/]+):generateContent$|^https:\/\/aiplatform\.googleapis\.com\/(?<version>[^/]+)\/publishers\/google\/models\/(?<model>[^/]+):predict$|^https:\/\/aiplatform\.googleapis\.com\/(?<version>[^/]+)\/publishers\/google\/models\/(?<model>[^/]+):streamGenerateContent$|^https:\/\/(?<endpoint_location>[^/]+)-aiplatform\.googleapis\.com\/(?<version>[^/]+)\/projects\/(?<project_id>[^/]+)\/locations\/(?<location_id>[^/]+)\/reasoningEngines\/(?<engine_id>[^/]+):query$|^https:\/\/(?<endpoint_location>[^/]+)-aiplatform\.googleapis\.com\/(?<version>[^/]+)\/projects\/(?<project_id>[^/]+)\/locations\/(?<location_id>[^/]+)\/reasoningEngines\/(?<engine_id>[^/]+):streamQuery$")