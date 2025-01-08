# Rate Limiting Proxy API - Take Home Assignment

This application is based on the user based authentication and rate limiting for api requests

- Allow user to register with jwt based system
- Create app with rate limits
- proxy requests to external api

We created a rate limiting API proxy server where user will access third party api by proxy server whenever the user authenticate we give him a apikey
means we register user with apikey as an app

In that that app register we confgiure rate limiting means user is access the apikey with our proxy server

The application implements two layers of rate limiting:

- Limits requests to a maximum of 100 requests every 15 minutes for all users.
- Each registered application has its own configurable rate limit based on registration.

### the endpoints are

- register user endpoint
- register app endpint
- proxy rate limit endpoint
