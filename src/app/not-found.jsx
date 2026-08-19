import EmptyNotice from '@/components/EmptyNotice'
import ScreenHeader from '@/components/ScreenHeader'

export default function NotFound() {
  return (
    <>
      <ScreenHeader title="찾을 수 없는 화면" backHref="/dashboard" />
      <main className="flex-1 px-4 py-5">
        <EmptyNotice
          headline="요청한 교량을 찾지 못했습니다."
          note="주소가 바뀌었거나, 공개 데이터에서 해당 교량이 빠졌을 수 있습니다."
          backHref="/bridges"
        />
      </main>
    </>
  )
}
