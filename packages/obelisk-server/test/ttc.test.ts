import assert from 'node:assert/strict';
import { test } from 'node:test';
import { transit_realtime } from 'gtfs-realtime-bindings';
import { nextArrivalMinutes } from '../ttc';

test('selects the earliest upcoming, served arrival at the requested stop', () => {
  const now = 1_800_000_000;
  const { SKIPPED } = transit_realtime.TripUpdate.StopTimeUpdate.ScheduleRelationship;
  const { CANCELED } = transit_realtime.TripDescriptor.ScheduleRelationship;
  const feed = transit_realtime.FeedMessage.encode({
    header: { gtfsRealtimeVersion: '2.0' },
    entity: [
      {
        id: 'scheduled',
        tripUpdate: {
          trip: { tripId: 'scheduled' },
          stopTimeUpdate: [
            { stopId: 'other-stop', arrival: { time: now + 10 } },
            { stopId: '8196', arrival: { time: now - 10 } },
            { stopId: '8196', arrival: { time: now + 20 }, scheduleRelationship: SKIPPED },
            { stopId: '8196', arrival: { time: now + 200 } },
            { stopId: '8196', arrival: { delay: 0 }, departure: { time: now + 70 } },
          ],
        },
      },
      {
        id: 'canceled',
        tripUpdate: {
          trip: { tripId: 'canceled', scheduleRelationship: CANCELED },
          stopTimeUpdate: [{ stopId: '8196', arrival: { time: now + 15 } }],
        },
      },
    ],
  }).finish();

  assert.equal(nextArrivalMinutes(feed, '8196', now * 1000), 2);
  assert.equal(nextArrivalMinutes(feed, 'missing', now * 1000), undefined);
});
