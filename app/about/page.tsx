import { PublicFooter, PublicHeader } from "@/components/PublicChrome";

const PLACES = [
  {
    name: "천안 본사",
    address: "충남 천안시 동남구 청수5로 4, 더다움 트윈브릿지 A동 7층",
    phone: "041-522-7327",
    map: "http://naver.me/5zJllvxb",
  },
  {
    name: "충주 폐차사업부",
    address: "충북 충주시 대소원면 산정독정길 143",
    phone: "043-853-7326",
    map: "http://naver.me/5xl3JhBf",
  },
  {
    name: "진천 수출사업부",
    address: "충북 진천군 진천읍 문진로 1308",
    phone: "041-522-7327",
    map: "https://naver.me/x7Bn3Dmv",
  },
  {
    name: "충주 부품사업부",
    address: "충북 충주시 풍동길 68",
    phone: "041-522-7327",
    map: "http://naver.me/5xl3JhBf",
  },
];

export default function AboutPage() {
  return (
    <div className="site-page">
      <PublicHeader />
      <main className="site-section">
        <div className="site-section-inner">
          <p className="site-kicker">Greetings</p>
          <h1 className="site-heading site-heading-lg">회사소개</h1>
          <p className="site-lead">
            환경을 생각하는 새로운 패러다임의 친환경 기업입니다.
          </p>
          <div className="site-prose">
            <p>
              알비오토는 폐차 말소된 자동차를 전문적으로 해체하여 재활용하는
              기업입니다. 환경보호와 자원 순환을 최우선 목표로 삼고 있으며,
              해체된 자동차에서 얻은 각종 자원을 세계 각지에 공급함으로써 글로벌
              시장에서의 입지를 다지고 있습니다.
            </p>
            <p>
              자동차 해체 및 재활용 산업의 선도 기업으로 자리매김하며, 지속 가능한
              자원 순환 경제에 기여하는 것을 목표로 매년 수천 톤의 폐차 해체·재활용을
              통해 국가 친환경 산업 발전에 기여하고 있습니다.
            </p>
            <p>노력과 열정으로 끊임없는 성장과 발전을 추구하는 기업이 되겠습니다.</p>
          </div>

          <h2 className="site-heading">오시는 길</h2>
          <div className="site-table-wrap">
            <table className="site-table">
              <thead>
                <tr>
                  <th>구분</th>
                  <th>주소</th>
                  <th>전화</th>
                  <th>지도</th>
                </tr>
              </thead>
              <tbody>
                {PLACES.map((place) => (
                  <tr key={place.name}>
                    <th>{place.name}</th>
                    <td>{place.address}</td>
                    <td>
                      <a href={`tel:${place.phone.replace(/-/g, "")}`}>{place.phone}</a>
                    </td>
                    <td>
                      <a href={place.map} target="_blank" rel="noopener noreferrer">
                        네이버지도
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
