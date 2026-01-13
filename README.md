# 아이온2 캐릭터 검색 Discord 봇

아이온2 캐릭터 정보를 Discord에서 쉽게 검색할 수 있는 봇입니다. 전체 서버에서 캐릭터를 검색하고, 버튼을 통해 원하는 서버의 상세 정보를 확인할 수 있습니다.

## 주요 기능

- 🔍 **전체 서버 검색**: 천족과 마족 모든 서버에서 캐릭터 검색
- 🎮 **서버 선택 버튼**: 여러 서버에 같은 닉네임이 있을 경우 버튼으로 선택
- 📊 **상세 캐릭터 정보**: 전투력, 직업, 스탯, 스킬 정보 표시
- ⚡ **빠른 응답**: 검색 결과 1개일 경우 자동으로 상세 정보 표시

## 기술 스택

- **Node.js** + **TypeScript**
- **Discord.js** v14 - Discord 봇 프레임워크
- **Puppeteer** - 웹 스크래핑
- **Axios** - HTTP 요청
- **aion2tool.com API** - 캐릭터 검색

## 설치 방법

### 1. 프로젝트 클론

```bash
git clone <repository-url>
cd aion-atool-discord-bot
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env` 파일을 프로젝트 루트에 생성:

```env
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_application_id
```

#### Discord 봇 토큰 발급 방법

1. [Discord Developer Portal](https://discord.com/developers/applications) 접속
2. "New Application" 클릭
3. 왼쪽 메뉴에서 "Bot" 선택
4. "Add Bot" 클릭
5. "Reset Token" 클릭하여 토큰 복사
6. **Privileged Gateway Intents**에서 다음 활성화:
   - ✅ MESSAGE CONTENT INTENT (필수)

### 4. 빌드 및 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

## 봇 초대하기

봇을 실행하면 콘솔에 초대 URL이 표시됩니다:

```
📎 봇 초대 URL:
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=...
```

이 URL을 브라우저에 붙여넣고 원하는 서버에 봇을 초대하세요.

## 사용 방법

### 기본 명령어

```
!{닉네임}           - 캐릭터 검색
!help             - 도움말 표시
!debug {닉네임}    - HTML 구조 확인 (개발용)
!screenshot {닉네임} - 스크린샷 저장 (개발용)
```

### 사용 예시

1. **캐릭터 검색**
   ```
   !티고
   ```
   - 전체 서버에서 "티고"를 검색합니다
   - 결과가 1개: 바로 상세 정보 표시
   - 결과가 여러 개: 서버 선택 버튼 표시

2. **서버 선택**
   - 버튼에 표시된 정보: `서버명 - Lv.레벨 (전투력)`
   - 원하는 서버 버튼 클릭 시 해당 캐릭터의 상세 정보 표시

3. **캐릭터 상세 정보**
   - 전투력, 직업, 아툴점수
   - 공격력, 치명타, 전투 속도 등 상세 스탯
   - 액티브 스킬, 패시브 스킬, 스티그마

## 배포 (Railway)

### 1. Railway 프로젝트 생성

1. [Railway](https://railway.app) 접속 및 로그인
2. "New Project" 클릭
3. GitHub 저장소 연결

### 2. 환경 변수 설정

Railway Dashboard에서:
- **Variables** 탭 클릭
- 다음 변수 추가:
  ```
  DISCORD_TOKEN=your_production_bot_token
  CLIENT_ID=your_application_id
  ```

### 3. 자동 배포

- `main` 브랜치에 push하면 자동으로 배포됩니다
- Railway가 자동으로 `npm install`, `npm run build`, `npm start` 실행

## 프로젝트 구조

```
aion-atool-discord-bot/
├── src/
│   ├── bot.ts                    # Discord 봇 메인 로직
│   ├── scrapers/
│   │   └── siteScraper.ts       # 웹 스크래핑 및 API 호출
│   ├── utils/
│   │   └── logger.ts            # 로깅 유틸리티
│   └── commands/
│       └── fetch.ts             # 명령어 핸들러
├── dist/                         # 빌드 결과물
├── .env                          # 환경 변수 (git에 포함 안 됨)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 주요 파일 설명

### `src/bot.ts`
- Discord 이벤트 리스너 (메시지, 버튼 클릭)
- 명령어 처리 로직
- 버튼 상호작용 핸들러

### `src/scrapers/siteScraper.ts`
- `searchAllServers()`: 전체 서버 검색 API 호출
- `fetchAionCharacter()`: Puppeteer로 캐릭터 상세 정보 스크래핑
- 브라우저 인스턴스 관리 (재사용)

## 개발

### 디버깅

콘솔에 다음과 같은 디버그 로그가 출력됩니다:

```
🔍 [MessageCreate] 검색 시작: 티고
✅ 천족: 12개 발견
✅ 마족: 21개 발견
✅ 총 33개의 캐릭터를 찾았습니다.
🔘 [MessageCreate] 결과 33개 - 버튼 표시
✅ [MessageCreate] 버튼 표시 완료
```

### 테스트 환경 구축

운영 봇과 별도로 테스트 봇을 만들어 사용하는 것을 권장합니다:

1. Discord Developer Portal에서 새 봇 생성
2. `.env` 파일에 테스트 봇 토큰 설정
3. 로컬에서는 테스트 봇, 배포 환경에서는 운영 봇 사용

## 문제 해결

### 봇이 응답하지 않는 경우

1. Discord Developer Portal에서 **MESSAGE CONTENT INTENT** 활성화 확인
2. 봇에게 메시지 읽기/보내기 권한 부여
3. `.env` 파일의 토큰 확인

### 여러 봇이 동시에 응답하는 경우

- 같은 토큰으로 여러 곳에서 봇이 실행 중일 수 있습니다
- 불필요한 봇 프로세스 종료 또는 테스트 봇 사용

### Puppeteer 에러

- Chromium 설치 확인: `npx puppeteer browsers install chrome`
- Railway 배포 시 buildpack 추가 필요할 수 있음

## 라이선스

ISC

## 기여

이슈나 PR은 언제든 환영합니다!

## 참고

- [aion2tool.com](https://aion2tool.com) - 아이온2 정보 사이트
- [Discord.js 문서](https://discord.js.org/)
- [Puppeteer 문서](https://pptr.dev/)
