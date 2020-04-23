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
    const span = tracer.startSpan(
        // we spit out the full operation name, which includes the service name
        'com-app-fxo-quoting-service/PriceOption',
        {
            childOf: parentSpanContext,
            tags: {[Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_SERVER}
        }
    );
    const notional= req.query.notional;
    span.log({
        'notional': notional,
        'operation': 'com-app-fxo-quoting-service/PriceOption',
    });
    console.log(`Sending notional to BCF ${notional}`);

    getPriceFromBCF(tracer, notional, span)
        .then( price => {
            console.log(`Sending price to gateway ${price}`);
            span.setTag(Tags.HTTP_STATUS_CODE, 200);
            span.finish();
            res.send(`Sending price, ${price}!`);
        })
        .catch( err => {
            console.error(`Error ${err}`);
            res.send(`Error ${err}!`);
            span.setTag(Tags.ERROR, true);
            span.setTag(Tags.HTTP_STATUS_CODE, err.statusCode || 500);
            span.finish();
        });
});


function getPriceFromBCF(tracer, notional, root_span) {
    const url = `http://localhost:8082/priceOption?notional=${notional}`;
    const span = tracer.startSpan('com-app-compute-farm/PriceOption', {childOf: root_span.context()});
    span.log({
        'notional': notional
    });
    return http_get(tracer, url, span);
}

