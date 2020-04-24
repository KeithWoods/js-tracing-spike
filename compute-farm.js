'use strict';

const express = require('express');
const app = express();
const initTracer = require('./tracing').initTracer;
const { Tags, FORMAT_HTTP_HEADERS } = require('opentracing');

const tracer = initTracer('com-app-compute-farm');

const port = 8082;

app.listen(port, function () {
    console.log('Publisher app listening on port ' + port);
});

app.get('/priceOption', function (req, res) {
    const parentSpanContext = tracer.extract(FORMAT_HTTP_HEADERS, req.headers);
    const span1 = tracer.startSpan('com-app-compute-farm/setup//IntraProcess', {
        childOf: parentSpanContext,
        tags: {[Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_SERVER}
    });
    const notional = req.query.notional;
    span1.log({
        'notional': notional
    });
    console.log(`pricing option internal 1 ${notional}`);

    setTimeout(() => {
        console.log(`pricing option internal 2 ${notional}`);
        span1.finish();

        const span2 = tracer.startSpan(
            'com-app-compute-farm/somePricing/IntraProcess',
            {
                childOf: parentSpanContext, // note related to parent not span1
            }
        );

        setTimeout(() => {
            console.log(`priced option ${notional}`);
            span2.finish();
            res.send('50K');
        }, 1000);
    }, 1000);
});



