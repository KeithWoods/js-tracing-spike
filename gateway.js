const assert = require('assert');
const initTracer = require('./tracing').initTracer;
const { Tags } = require('opentracing');
const { http_get } = require('./utils');

const tracer = initTracer('com-app-gateway');

function onGatewayWebsocketReceived(notional) {
    // this first span should denote the websocket as that's where it's starting
    // given the gateway is generic the span should include the full operation name,
    // other services wouldn't do this
    const operationSpan = tracer.startSpan(`com-app-fxo-quoting-service/PriceOption/Operation`);
    operationSpan.setTag('notional', notional);

    const intraProcessSpan = tracer.startSpan(
        `com-app-fxo-quoting-service/PriceOption/IntraProcess`,
        { childOf: operationSpan.context() }
    );

    console.log(`Pricing FXO notional  ${notional}`);

    // emulate some internal processing
    setTimeout(() => {
        intraProcessSpan.finish();
        requestPriceOption(notional, operationSpan)
            .then( price => {
                console.log(`Price received ${price}`);
                const replyIntraProcessSpan = tracer.startSpan(
                    'com-app-fxo-quoting-service/PriceOption/IntraProcess',
                    {
                        childOf: operationSpan.context(),
                    }
                );
                setTimeout(() => {
                    console.log(`Sending price to user ${price}`);
                    operationSpan.setTag(Tags.HTTP_STATUS_CODE, 200);
                    operationSpan.log({
                        'operation': 'websocket/com-app-fxo-quoting-service/PriceOption',
                        'price': price
                    });
                    replyIntraProcessSpan.finish()
                    operationSpan.finish();
                }, 1000);

            })
            .catch( err => {
                console.error(`Price Error ${err}`);
                operationSpan.setTag(Tags.ERROR, true);
                operationSpan.setTag(Tags.HTTP_STATUS_CODE, err.statusCode || 500);
                operationSpan.finish();
            });
    }, 1000);
}

function requestPriceOption(notional, operationSpan) {
    const url = `http://localhost:8081/priceOption?notional=${notional}`;
    const roundTripSpan = tracer.startSpan(`com-app-fxo-quoting-service/PriceOption/RoundTrip`, {childOf: operationSpan.context()});
    roundTripSpan.log({
        'topic' : 'com-app-fxo-quoting-service-inbox',
        'event': 'PriceOption',
        'notional': notional
    });
    return http_get(tracer, url, roundTripSpan);
}  

assert.ok(process.argv.length == 3, 'expecting one argument');

const notional = process.argv[2];


onGatewayWebsocketReceived(notional);

setTimeout( e => {tracer.close();}, 12000);


  

