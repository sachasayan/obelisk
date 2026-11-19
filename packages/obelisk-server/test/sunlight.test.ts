import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sunlightLook, sunsetMinute } from '../modes/sunlight.index';

const toronto = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Toronto', year: 'numeric', month: 'numeric', day: 'numeric', hourCycle: 'h23',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});

test('Sunlight follows seasonal sunset, cools to deep blue, and fades to black by midnight', () => {
  const winter = sunsetMinute(Date.UTC(2026, 11, 21), 43.6532, -79.3832, toronto);
  const summer = sunsetMinute(Date.UTC(2026, 5, 21), 43.6532, -79.3832, toronto);
  assert.ok(winter > 16 * 60 + 35 && winter < 17 * 60);
  assert.ok(summer > 21 * 60 && summer < 21 * 60 + 15);

  assert.equal(sunlightLook(780, winter), undefined);
  assert.equal(sunlightLook(winter, winter), undefined);
  const sunset = sunlightLook(winter + 40, winter);
  const night = sunlightLook(23 * 60, winter);
  assert.ok((sunset.horizon >> 16) > (sunset.horizon & 255));
  assert.ok((night.horizon & 255) > (night.horizon >> 16));
  assert.ok(night.glow < sunset.glow);
  assert.ok(sunlightLook(1439, winter).glow < .001);
  assert.equal(sunlightLook(1440, winter), undefined);
  assert.equal(sunlightLook(0, winter), undefined);
});
