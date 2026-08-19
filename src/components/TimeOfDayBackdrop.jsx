'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

/**
 * 대시보드 바탕 — 시각에 따라 네 장 중 하나를 깐다.
 * ---------------------------------------------------------------------------
 * 왜 클라이언트 컴포넌트인가. 두 가지 이유가 겹친다.
 *
 *   1. 대시보드는 한 시간마다 다시 만들어지는 정적 화면이다
 *      (`revalidate = 3600`). 서버에서 시각을 읽어 고르면 그 결과가 캐시에
 *      담겨, 저녁에 만든 화면이 다음 갱신까지 새벽 방문자에게도 나간다.
 *   2. 버셀 서버 시계는 UTC 다. 서버 기준으로 고르면 한국 방문자에게 아홉 시간
 *      어긋난 바탕이 깔린다.
 *
 * 그래서 방문자 브라우저의 시계로 고른다. 첫 렌더에서는 아무것도 내보내지 않고
 * (서버·클라이언트가 같은 결과라 hydration 이 어긋나지 않는다) 마운트 뒤에 깐다.
 *
 * 경계 시각에 한 번만 다시 계산한다. 몇 분마다 깨워 확인하는 것보다 정확하고,
 * 화면을 열어 둔 채 자정을 넘겨도 바탕이 따라 바뀐다.
 *
 * 이 사진들은 특정 교량의 현재 모습이 아니다. 바탕 장식이므로 위에 반투명 막을
 * 덮어 글자 대비를 지키고, 옆에 촬영 시각이나 관측값 같은 문구를 붙이지 않는다 —
 * 붙이면 지금 그 다리를 비추는 화면으로 읽힌다 (히어로 영상과 같은 이유).
 * ---------------------------------------------------------------------------
 */

/** 구간은 [from, to) 로 읽는다. 24 는 자정을 뜻한다. */
const SLOTS = [
  { key: 'dawn', from: 0, to: 8, src: '/backgrounds/dawn.png' },
  { key: 'day', from: 8, to: 18, src: '/backgrounds/day.png' },
  { key: 'evening', from: 18, to: 21, src: '/backgrounds/evening.png' },
  { key: 'night', from: 21, to: 24, src: '/backgrounds/night.png' },
]

function slotFor(hour) {
  return SLOTS.find((slot) => hour >= slot.from && hour < slot.to) ?? SLOTS[0]
}

export default function TimeOfDayBackdrop() {
  const [slot, setSlot] = useState(null)

  useEffect(() => {
    let timer

    const apply = () => {
      const now = new Date()
      const current = slotFor(now.getHours())
      setSlot(current)

      // 다음 경계까지 기다린다. setHours(24) 는 다음날 자정으로 넘어간다.
      const boundary = new Date(now)
      boundary.setHours(current.to, 0, 0, 0)
      // 1분 하한 — 시계가 경계에 걸쳐 있을 때 타이머가 촘촘히 도는 것을 막는다.
      timer = setTimeout(apply, Math.max(boundary.getTime() - now.getTime(), 60_000))
    }

    apply()
    return () => clearTimeout(timer)
  }, [])

  if (!slot) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      {/* fill 이므로 부모가 위치를 잡아야 한다 (위 div 가 fixed).
          alt 는 빈 문자열 — 장식이라 읽어 줄 내용이 없다. */}
      <Image
        key={slot.key}
        src={slot.src}
        alt=""
        fill
        sizes="100vw"
        priority={false}
        className="object-cover"
      />
      {/* 네 장의 밝기가 서로 달라서, 막이 없으면 어떤 시간대에는 본문 글자가
          읽히지 않는다. 카드가 대부분 불투명하므로 바탕은 여백에서 보인다. */}
      <div className="absolute inset-0 bg-background/70" />
    </div>
  )
}
