import {
  Client,
  GatewayIntentBits,
  Events,
  PermissionFlagsBits,
} from "discord.js";
import * as dotenv from "dotenv";
import {
  fetchAionCharacter,
  debugAionPage,
  screenshotAionPage,
  closeBrowser,
} from "./scrapers/siteScraper";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ ${c.user.tag} 봇이 준비되었습니다!`);

  const permissions =
    PermissionFlagsBits.ViewChannel |
    PermissionFlagsBits.SendMessages |
    PermissionFlagsBits.ReadMessageHistory |
    PermissionFlagsBits.EmbedLinks

  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${c.user.id}&permissions=${permissions}&scope=bot`;

  console.log(`\n📎 봇 초대 URL:\n${inviteUrl}\n`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("!")) {
    const nickname = message.content.slice(1).trim();

    if (!nickname) return;

    // 디버그 명령어
    if (nickname.startsWith("debug ")) {
      const debugNick = nickname.replace("debug ", "");
      await message.reply(`🔍 HTML 구조 확인 중... (콘솔 확인)`);
      await debugAionPage(debugNick);
      return;
    }

    // 스크린샷 명령어
    if (nickname.startsWith("screenshot ")) {
      const targetNick = nickname.replace("screenshot ", "");
      await message.reply(`📸 스크린샷 촬영 중...`);
      await screenshotAionPage(targetNick);
      await message.reply(`✅ screenshot-${targetNick}.png 저장 완료`);
      return;
    }

    // 도움말
    if (nickname === "help" || nickname === "도움말") {
      const helpMessage = `
📖 **아이온2 캐릭터 검색 봇 사용법**

\`!{닉네임}\` - 캐릭터 정보 검색
\`!debug {닉네임}\` - HTML 구조 확인 (개발용)
\`!screenshot {닉네임}\` - 스크린샷 저장 (개발용)
\`!help\` - 도움말 표시
      `.trim();
      await message.reply(helpMessage);
      return;
    }

    // 캐릭터 검색
    try {
      await message.reply(`⏳ **${nickname}** 캐릭터를 검색하는 중...`);

      const result = await fetchAionCharacter(nickname);

      await message.reply({ embeds: [result.embed] });
    } catch (error) {
      console.error("에러:", error);
      await message.reply(`❌ **${nickname}** 캐릭터를 찾을 수 없습니다.`);
    }
  }
});

// Graceful shutdown - 브라우저 정리
process.on("SIGINT", async () => {
  console.log("\n👋 봇 종료 중...");
  await closeBrowser();
  client.destroy();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n👋 봇 종료 중...");
  await closeBrowser();
  client.destroy();
  process.exit(0);
});

// 에러 핸들링
process.on("unhandledRejection", (error) => {
  console.error("❌ 처리되지 않은 Promise 에러:", error);
});

client.on(Events.Error, (error) => {
  console.error("❌ Discord 클라이언트 에러:", error);
});

client.login(process.env.DISCORD_TOKEN);