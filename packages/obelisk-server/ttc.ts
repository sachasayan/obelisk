import { transit_realtime } from 'gtfs-realtime-bindings';

const tripUpdatesUrl = 'https://bustime.ttc.ca/gtfsrt/trips';
const tripStatus = transit_realtime.TripDescriptor.ScheduleRelationship;
const stopStatus = transit_realtime.TripUpdate.StopTimeUpdate.ScheduleRelationship;
const defaultStopId = '8196'; // TTC stop code 816, College St at Borden St.

export function nextArrivalMinutes(bytes: Uint8Array, stopId: string, now = Date.now()) {
  const feed = transit_realtime.FeedMessage.decode(bytes);
  const nowInSeconds = now / 1000;
  let next = Infinity;

  for (const { tripUpdate } of feed.entity) {
    const status = tripUpdate?.trip.scheduleRelationship;
    if (!tripUpdate || status === tripStatus.CANCELED || status === tripStatus.DELETED) continue;

    for (const update of tripUpdate.stopTimeUpdate ?? []) {
      if (update.stopId !== stopId || update.scheduleRelationship === stopStatus.SKIPPED ||
          update.scheduleRelationship === stopStatus.NO_DATA) continue;

      const arrival = Number(update.arrival?.time);
      const time = arrival > 0 ? arrival : Number(update.departure?.time);
      if (time >= nowInSeconds && time < next) next = time;
    }
  }

  return Number.isFinite(next) ? Math.ceil((next - nowInSeconds) / 60) : undefined;
}

export async function fetchArrivalMinutes(signal: AbortSignal) {
  const response = await fetch(tripUpdatesUrl, { signal });
  if (!response.ok) throw new Error(`TTC feed returned HTTP ${response.status}`);

  const bytes = new Uint8Array(await response.arrayBuffer());
  return nextArrivalMinutes(bytes, process.env.TTC_STOP_ID ?? defaultStopId);
}
