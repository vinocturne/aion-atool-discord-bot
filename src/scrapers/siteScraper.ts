import { EmbedBuilder } from "discord.js";
import puppeteer, { Browser } from "puppeteer";
import axios from "axios";

// 대기 헬퍼 함수
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 공유 브라우저 인스턴스
let sharedBrowser: Browser | null = null;

// 브라우저 인스턴스 가져오기 (재사용)
async function getBrowser(): Promise<Browser> {
  // 기존 브라우저가 있고 연결되어 있는지 확인
  if (sharedBrowser) {
    try {
      // 브라우저가 실제로 동작하는지 테스트
      if (sharedBrowser.isConnected()) {
        console.log("♻️ 기존 브라우저 인스턴스 재사용");
        return sharedBrowser;
      }
    } catch (error) {
      console.log("⚠️ 기존 브라우저 연결 끊김, 재생성");
      sharedBrowser = null;
    }
  }

  // 새 브라우저 인스턴스 생성
  console.log("🌐 새 브라우저 인스턴스 생성");
  try {
    sharedBrowser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      timeout: 60000, // 60초 타임아웃
    });

    // 브라우저 이벤트 리스너 추가
    sharedBrowser.on("disconnected", () => {
      console.log("⚠️ 브라우저 연결 끊김");
      sharedBrowser = null;
    });

    return sharedBrowser;
  } catch (error) {
    console.error("❌ 브라우저 생성 실패:", error);
    sharedBrowser = null;
    throw error;
  }
}

// 브라우저 닫기 (앱 종료 시 호출)
export async function closeBrowser() {
  if (sharedBrowser) {
    console.log("🔒 브라우저 종료");
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}

interface SkillInfo {
  name: string;
  level: string;
}

interface CharacterStats {
  nickname: string;
  serverName: string;
  combatPower: string;
  job: string;
  dpsScore: string;
  jobImage: string;
  attackPower: string;
  criticalHit: string;
  combatSpeed: string;
  weaponDamageAmplification: string;
  damageAmplification: string;
  criticalDamageAmplification: string;
  skillDamage: string;
  cooldownReduction: string;
  stunHit: string;
  perfect: string;
  multiHit: string;
  accuracy: string;
  activeSkills: SkillInfo[];
  passiveSkills: SkillInfo[];
  stigmas: SkillInfo[];
}

export interface SearchResult {
  avatar_url: string;
  combat_power: number;
  combat_score?: number;
  image_url: string;
  job: string;
  level: number;
  nickname: string;
  race: string;
  server: string;
  server_id: number;
  server_name: string;
  updated_at?: string;
}

// 전체 서버에서 캐릭터 검색
export async function searchAllServers(
  nickname: string
): Promise<SearchResult[]> {
  console.log(`🔍 전체 서버 검색 중: ${nickname}`);

  let results1: SearchResult[] = [];
  let results2: SearchResult[] = [];

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // User-Agent 설정
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // 먼저 메인 페이지에 접속하여 Cloudflare 챌린지 통과
    console.log("🌐 메인 페이지 접속 중...");
    await page.goto("https://aion2tool.com", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Cloudflare 챌린지 완료 대기 (더 길게)
    await wait(5000);

    // 천족과 마족 검색을 한 번에 처리 (더 빠름)
    console.log("🔍 천족 & 마족 검색 중...");
    const [response1, response2] = await page.evaluate(
      async (nickname) => {
        const fetchRace = async (race: number) => {
          try {
            const response = await fetch(
              "https://aion2tool.com/api/character/search-all-servers",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  race: race,
                  keyword: nickname,
                }),
              }
            );
            return await response.json();
          } catch (error) {
            console.error(`Race ${race} 검색 실패:`, error);
            return null;
          }
        };

        // 천족과 마족 병렬 요청
        return await Promise.all([fetchRace(1), fetchRace(2)]);
      },
      nickname
    );

    // 천족 결과 처리
    if (response1) {
      const data1 = response1?.data || response1;
      results1 = Array.isArray(data1) ? data1 : [];
      console.log(`✅ 천족: ${results1.length}개 발견`);
    } else {
      console.log("⚠️ 천족 검색 실패");
    }

    // 마족 결과 처리
    if (response2) {
      const data2 = response2?.data || response2;
      results2 = Array.isArray(data2) ? data2 : [];
      console.log(`✅ 마족: ${results2.length}개 발견`);
    } else {
      console.log("⚠️ 마족 검색 실패");
    }

    // 두 결과를 합침
    const allResults = [...results1, ...results2];

    console.log(`✅ 총 ${allResults.length}개의 캐릭터를 찾았습니다.`);

    return allResults;
  } finally {
    // 페이지만 닫기 (브라우저는 유지)
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.error("페이지 닫기 실패:", e);
      }
    }
  }
}

export async function fetchAionCharacter(
  nickname: string,
  serverId: number = 2006
): Promise<{
  embed: EmbedBuilder;
  url: string;
}> {
  const url = `https://aion2tool.com/char/serverid=${serverId}/${encodeURIComponent(
    nickname
  )}`;

  let browser;
  let page;

  try {
    browser = await getBrowser();
    page = await browser.newPage();
  } catch (error) {
    console.error("❌ 브라우저/페이지 생성 실패:", error);
    // 브라우저 재생성 시도
    sharedBrowser = null;
    browser = await getBrowser();
    page = await browser.newPage();
  }

  try {
    console.log(`🔍 검색 중: ${url}`);

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await wait(3000);

    try {
      await page.waitForSelector("#result-nickname", { timeout: 5000 });
    } catch (e) {
      console.log("⚠️ #result-nickname 요소를 찾지 못했습니다.");
    }

    // 데이터 추출
    const characterData = await page.evaluate((): CharacterStats => {
      // 기본 정보
      const nickname =
        document.querySelector("#result-nickname")?.textContent?.trim() || "";
      const serverName =
        document.querySelector("#result-server")?.textContent?.trim() || "";
      const combatPower =
        document.querySelector("#result-combat-power")?.textContent?.trim() ||
        "";
      const job =
        document.querySelector("#result-job")?.textContent?.trim() || "";
      const dpsScore =
        document.querySelector("#dps-score-value")?.textContent?.trim() || "";
      const jobImage =
        document
          .querySelector("#result-job-container img")
          ?.getAttribute("src") || "";

      // 상세 스탯
      const attackPower =
        document.querySelector("#attack-power-value")?.textContent?.trim() ||
        "-";
      const criticalHit =
        document.querySelector("#critical-hit-value")?.textContent?.trim() ||
        "-";
      const combatSpeed =
        document.querySelector("#combat-speed-value")?.textContent?.trim() ||
        "-";
      const weaponDamageAmplification =
        document
          .querySelector("#weapon-damage-amplification-value")
          ?.textContent?.trim() || "-";
      const damageAmplification =
        document
          .querySelector("#damage-amplification-value")
          ?.textContent?.trim() || "-";
      const criticalDamageAmplification =
        document
          .querySelector("#critical-damage-amplification-value")
          ?.textContent?.trim() || "-";
      const skillDamage =
        document.querySelector("#skill-damage-value")?.textContent?.trim() ||
        "-";
      const cooldownReduction =
        document
          .querySelector("#cooldown-reduction-value")
          ?.textContent?.trim() || "-";
      const stunHit =
        document.querySelector("#stun-hit-value")?.textContent?.trim() || "-";
      const perfect =
        document.querySelector("#perfect-value")?.textContent?.trim() || "-";
      const multiHit =
        document.querySelector("#multi-hit-value")?.textContent?.trim() || "-";
      const accuracy =
        document.querySelector("#accuracy-value")?.textContent?.trim() || "-";

      // 스킬 정보 추출 함수
      const extractSkills = (containerId: string) => {
        const container = document.querySelector(containerId);
        if (!container) return [];

        const skills: { name: string; level: string }[] = [];
        const skillElements = container.querySelectorAll("[data-skill-name]");

        skillElements.forEach((element) => {
          const name =
            element.getAttribute("data-skill-name") ||
            element.querySelector(".skill-name")?.textContent?.trim() ||
            "";
          const level =
            element.querySelector(".skill-level")?.textContent?.trim() || "";

          if (name) {
            skills.push({ name, level });
          }
        });

        return skills.slice(0, 5);
      };

      const activeSkills = extractSkills("#skills-active-container");
      const passiveSkills = extractSkills("#skills-passive-container");
      const stigmas = extractSkills("#stigmas-container");

      return {
        nickname,
        serverName,
        combatPower,
        job,
        dpsScore,
        jobImage,
        attackPower,
        criticalHit,
        combatSpeed,
        weaponDamageAmplification,
        damageAmplification,
        criticalDamageAmplification,
        skillDamage,
        cooldownReduction,
        stunHit,
        perfect,
        multiHit,
        accuracy,
        activeSkills,
        passiveSkills,
        stigmas,
      };
    });

    console.log("📊 추출된 데이터:", characterData);
    console.log("⚔️ 액티브 스킬:", characterData.activeSkills);
    console.log("🛡️ 패시브 스킬:", characterData.passiveSkills);
    console.log("✨ 스티그마:", characterData.stigmas);

    if (
      !characterData.nickname &&
      !characterData.combatPower &&
      !characterData.job
    ) {
      throw new Error("캐릭터를 찾을 수 없습니다.");
    }

    // Embed 생성
    const embed = new EmbedBuilder()
      .setColor(0x00ae86)
      .setTitle(
        `🎮 ${characterData.nickname || nickname}[${characterData.serverName}]`
      )
      .setURL(url)
      .addFields(
        {
          name: "⚔️ 전투력",
          value: characterData.combatPower || "?",
          inline: true,
        },
        {
          name: "💼 직업",
          value: characterData.job || "?",
          inline: true,
        },
        {
          name: "📊 아툴점수",
          value: characterData.dpsScore || "?",
          inline: true,
        },
        {
          name: "\u200B",
          value: "**📊 상세 스탯**",
          inline: false,
        },
        {
          name: "공격력",
          value: characterData.attackPower || "-",
          inline: true,
        },
        {
          name: "치명타",
          value: characterData.criticalHit || "-",
          inline: true,
        },
        {
          name: "전투 속도",
          value: characterData.combatSpeed || "-",
          inline: true,
        },
        {
          name: "무기 피해 증폭",
          value: characterData.weaponDamageAmplification || "-",
          inline: true,
        },
        {
          name: "피해 증폭",
          value: characterData.damageAmplification || "-",
          inline: true,
        },
        {
          name: "치명 피해 증폭",
          value: characterData.criticalDamageAmplification || "-",
          inline: true,
        },
        {
          name: "스킬 전투 점수",
          value: characterData.skillDamage || "-",
          inline: true,
        },
        {
          name: "쿨타임 감소",
          value: characterData.cooldownReduction || "-",
          inline: true,
        },
        {
          name: "강타",
          value: characterData.stunHit || "-",
          inline: true,
        },
        {
          name: "완벽",
          value: characterData.perfect || "-",
          inline: true,
        },
        {
          name: "다단 히트",
          value: characterData.multiHit || "-",
          inline: true,
        },
        {
          name: "명중",
          value: characterData.accuracy || "-",
          inline: true,
        }
      )
      .setTimestamp()
      .setFooter({ text: "Aion2Tool" });

    // 직업 이미지
    if (characterData.jobImage) {
      const imageUrl = characterData.jobImage.startsWith("http")
        ? characterData.jobImage
        : `https://aion2tool.com${characterData.jobImage}`;
      embed.setThumbnail(imageUrl);
    }

    // 액티브 스킬 추가
    if (characterData.activeSkills.length > 0) {
      const skillList = characterData.activeSkills
        .map((skill: SkillInfo) => `\`${skill.name}\` ${skill.level}`)
        .join("\n");

      embed.addFields({
        name: "\u200B",
        value: `**⚔️ 액티브 스킬**\n${skillList}`,
        inline: false,
      });
    }

    // 패시브 스킬 추가
    if (characterData.passiveSkills.length > 0) {
      const skillList = characterData.passiveSkills
        .map((skill: SkillInfo) => `\`${skill.name}\` ${skill.level}`)
        .join("\n");

      embed.addFields({
        name: "\u200B",
        value: `**🛡️ 패시브 스킬**\n${skillList}`,
        inline: false,
      });
    }

    // 스티그마 추가
    if (characterData.stigmas.length > 0) {
      const skillList = characterData.stigmas
        .map((skill: SkillInfo) => `\`${skill.name}\` ${skill.level}`)
        .join("\n");

      embed.addFields({
        name: "\u200B",
        value: `**✨ 스티그마**\n${skillList}`,
        inline: false,
      });
    }

    return { embed, url };
  } catch (error) {
    console.error("크롤링 실패:", error);
    throw error;
  } finally {
    // 페이지만 닫기 (브라우저는 유지)
    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.error("페이지 닫기 실패:", e);
      }
    }
  }
}

export async function debugAionPage(nickname: string): Promise<void> {
  const url = `https://aion2tool.com/char/serverid=2006/${encodeURIComponent(
    nickname
  )}`;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await wait(3000);

    const html = await page.content();

    console.log("========== HTML 구조 확인 (처음 1000자) ==========");
    console.log(html.substring(0, 1000));
    console.log("==================================================");

    const elements = await page.evaluate((): any => {
      const extractSkillsDebug = (containerId: string) => {
        const container = document.querySelector(containerId);
        if (!container) return { found: false, html: "", skills: [] };

        const skills: any[] = [];
        const skillElements = container.querySelectorAll("[data-skill-name]");

        skillElements.forEach((element, idx) => {
          if (idx < 3) {
            skills.push({
              dataSkillName: element.getAttribute("data-skill-name"),
              innerHTML: element.innerHTML.substring(0, 200),
              className: element.className,
            });
          }
        });

        return {
          found: true,
          html: container.innerHTML.substring(0, 500),
          skillCount: skillElements.length,
          skills,
        };
      };

      return {
        title: document.title,
        activeSkills: extractSkillsDebug("#skills-active-container"),
        passiveSkills: extractSkillsDebug("#skills-passive-container"),
        stigmas: extractSkillsDebug("#stigmas-container"),
      };
    });

    console.log("========== 액티브 스킬 디버그 ==========");
    console.log(JSON.stringify(elements.activeSkills, null, 2));
    console.log("========================================");

    console.log("========== 패시브 스킬 디버그 ==========");
    console.log(JSON.stringify(elements.passiveSkills, null, 2));
    console.log("========================================");

    console.log("========== 스티그마 디버그 ==========");
    console.log(JSON.stringify(elements.stigmas, null, 2));
    console.log("===================================");
  } catch (error) {
    console.error("디버그 실패:", error);
  } finally {
    await page.close();
  }
}

export async function screenshotAionPage(nickname: string): Promise<void> {
  const url = `https://aion2tool.com/char/serverid=2006/${encodeURIComponent(
    nickname
  )}`;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await wait(3000);

    await page.screenshot({
      path: `screenshot-${nickname}.png`,
      fullPage: true,
    });

    console.log(`✅ 스크린샷 저장: screenshot-${nickname}.png`);
  } catch (error) {
    console.error("스크린샷 실패:", error);
  } finally {
    await page.close();
  }
}
