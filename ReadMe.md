# Open tracing with Jeager Spike

This is based on code from https://github.com/yurishkuro/opentracing-tutorial/

## To Start

Yarn install 

```
yarn install
```

Bring up jaeger:
```
docker-compose up
```

Start the mock compute farm:
```
node ./compute-farm.js
```

Start the mock pricing service:
```
node ./compute-farm.js
```

Start mock gateway passing a notional to 'price':
```
node ./gateway.js 100
```

Check the results at http://localhost:16686