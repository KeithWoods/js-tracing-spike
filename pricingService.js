const express = require('express');
const app = express();
const initTracer = require('./tracing').initTracer;
const { Tags, FORMAT_HTTP_HEADERS } = require('opentracing');
const { http_get } = require('./utils');

const tracer = initTracer('com-app-fxo-pricing-service');

const port = 8081;

app.listen(port, function () {
    console.log('Pricing app listening on port ' + port);
});

app.get('/priceOption', function (req, res) {

    const parentSpanContext = tracer.extract(FORMAT_HTTP_HEADERS, req.headers);

    const intraProcessSpan = tracer.startSpan(
        // we spit out the full operation name, which includes the service name
        'com-app-fxo-quoting-service/PriceOption/IntraProcess',
        {
            childOf: parentSpanContext,
            tags: {[Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_SERVER}
        }
    );

    const notional= req.query.notional;
    console.log(`Sending notional to BCF ${notional}`);

    // emulate some processing time
    setTimeout(() => {
        intraProcessSpan.finish();
        getPriceFromBCF(tracer, notional, parentSpanContext)
            .then( price => {
                const replyIntraProcessSpan = tracer.startSpan(
                    'com-app-fxo-quoting-service/PriceOption/IntraProcess',
                    {
                        childOf: parentSpanContext,
                    }
                );
                setTimeout(() => {
                    console.log(`Sending price to gateway ${price}`);
                    res.send(`Sending price, ${price}!`);
                    replyIntraProcessSpan.finish();
                }, 500);
            })
            .catch( err => {
                console.error(`Error ${err}`);
                res.send(`Error ${err}!`);
            });

    }, 2000);
});


function getPriceFromBCF(tracer, notional, parentSpanContext) {
    const url = `http://localhost:8082/priceOption?notional=${notional}`;
    const roundTripSpan = tracer.startSpan('com-app-compute-farm/PriceOption/RoundTrip', {childOf: parentSpanContext});
    roundTripSpan.log({
        'notional': notional
    });
    return http_get(tracer, url, roundTripSpan);
}

