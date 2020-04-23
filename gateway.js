const assert = require('assert');
const initTracer = require('./tracing').initTracer;
const { Tags } = require('opentracing');
const { http_get } = require('./utils');

const tracer = initTracer('com-app-gateway');

function onGatewayWebsocketReceived(notional) {
    // this first span should denote the websocket as that's where it's starting
    // given the gateway is generic the span should include the full operation name,
    // other services wouldn't do this
    const span = tracer.startSpan(`websocket/com-app-fxo-quoting-service/PriceOption`);
    span.setTag('notional', notional);
    console.log(`Pricing FXO notional  ${notional}`);

    // emulate some internal processing
    setTimeout(() => {
        requestPriceOption(notional, span)
            .then( price => {
                console.log(`Price received ${price}`);
                span.setTag(Tags.HTTP_STATUS_CODE, 200)
                span.log({
                    'operation': 'websocket/com-app-fxo-quoting-service/PriceOption',
                    'price': price
                });
                span.finish();
            })
            .catch( err => {
                console.error(`Price Error ${err}`);
                span.setTag(Tags.ERROR, true);
                span.setTag(Tags.HTTP_STATUS_CODE, err.statusCode || 500);
                span.finish();
            });
    }, 1000);
}

function requestPriceOption(notional, root_span) {
    const url = `http://localhost:8081/priceOption?notional=${notional}`;
    // when making a call, the full trace operation name is used (service type + messaging operation name)
    const span = tracer.startSpan(`com-app-fxo-quoting-service/PriceOption`, {childOf: root_span.context()});
    span.log({
        'topic' : 'com-app-fxo-quoting-service-inbox',
        'event': 'PriceOption',
        'notional': notional
    });
    return http_get(tracer, url, span);
}  

assert.ok(process.argv.length == 3, 'expecting one argument');

const notional = process.argv[2];


onGatewayWebsocketReceived(notional);

setTimeout( e => {tracer.close();}, 12000);


  

