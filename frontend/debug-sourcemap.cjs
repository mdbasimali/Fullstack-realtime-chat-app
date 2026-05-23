const fs = require('fs');
const { SourceMapConsumer } = require('source-map');

const rawSourceMap = JSON.parse(fs.readFileSync('./dist/assets/index-CW_B9klO.js.map', 'utf8'));

SourceMapConsumer.with(rawSourceMap, null, consumer => {
  const pos = consumer.originalPositionFor({
    line: 388,
    column: 176063
  });

  console.log(pos);
});
