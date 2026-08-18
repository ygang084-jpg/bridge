/**
 * 두 지점 사이의 거리(m). 하버사인.
 *
 * 이 계산은 브라우저에서 돈다 (PRD §15.7). 사용자 좌표를 서버로 보내면
 * DB에 저장하지 않아도 접근 로그에 남기 때문에, 애초에 보내지 않는다.
 */
const EARTH_RADIUS_M = 6371000

export function distanceInMeters(from, to) {
  if (
    !Number.isFinite(from?.lat) ||
    !Number.isFinite(from?.lng) ||
    !Number.isFinite(to?.lat) ||
    !Number.isFinite(to?.lng)
  ) {
    return null
  }

  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2

  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a)))
}

/** 1km 미만은 m, 그 이상은 소수 첫째 자리까지 km. */
export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return null
  if (meters < 1000) return `${meters}m`
  return `${(meters / 1000).toFixed(1)}km`
}
