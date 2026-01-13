import {
  Client,
  GatewayIntentBits,
  Events,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import * as dotenv from "dotenv";
import {
  fetchAionCharacter,
  debugAionPage,
  screenshotAionPage,
  closeBrowser,
  searchAllServers,
  SearchResult,
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

// 버튼 상호작용 처리
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  // 버튼 customId 형식: "char_서버ID_닉네임"
  const [action, serverId, ...nicknameParts] = interaction.customId.split("_");

  if (action !== "char") return;

  const nickname = nicknameParts.join("_");
  const serverIdNum = parseInt(serverId);

  console.log(`🔘 [InteractionCreate] 버튼 클릭: ${nickname} (서버ID: ${serverIdNum})`);

  try {
    await interaction.deferReply();

    // 버튼 제거 (원본 메시지 수정)
    await interaction.message.edit({
      content: `✅ **${nickname}** 캐릭터 정보를 불러오는 중...`,
      components: [], // 모든 버튼 제거
    });

    const result = await fetchAionCharacter(nickname, serverIdNum);

    await interaction.editReply({ embeds: [result.embed] });
    console.log(`✅ [InteractionCreate] 캐릭터 정보 표시 완료`);
  } catch (error) {
    console.error("❌ [InteractionCreate] 캐릭터 정보 가져오기 실패:", error);
    await interaction.editReply({
      content: `❌ **${nickname}** 캐릭터 정보를 가져올 수 없습니다.`,
    });
  }
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
      console.log(`🔍 [MessageCreate] 검색 시작: ${nickname}`);
      const searchingMsg = await message.reply(`⏳ **${nickname}** 캐릭터를 검색하는 중...`);

      // 전체 서버에서 검색
      const searchResults = await searchAllServers(nickname);
      console.log(`📊 [MessageCreate] 검색 결과: ${searchResults.length}개`);

      if (searchResults.length === 0) {
        console.log(`❌ [MessageCreate] 결과 없음 - 에러 메시지 표시`);
        await searchingMsg.edit(`❌ **${nickname}** 캐릭터를 찾을 수 없습니다.`);
        return;
      }

      if (searchResults.length === 1) {
        console.log(`✅ [MessageCreate] 결과 1개 - 바로 상세 정보 표시`);
        // 결과가 1개면 바로 상세 정보 표시
        const result = await fetchAionCharacter(
          searchResults[0].nickname,
          searchResults[0].server_id
        );
        await searchingMsg.delete();
        await message.reply({ embeds: [result.embed] });
        return;
      }

      console.log(`🔘 [MessageCreate] 결과 ${searchResults.length}개 - 버튼 표시`);
      // 결과가 여러 개면 서버 선택 버튼 생성
      const buttons: ButtonBuilder[] = [];

      // Discord 메시지당 최대 5개 버튼까지 표시 (더 많으면 여러 줄로)
      for (const char of searchResults.slice(0, 25)) { // 최대 25개 (5x5)
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`char_${char.server_id}_${char.nickname}`)
            .setLabel(
              `${char.server_name} - Lv.${char.level} (${char.combat_power.toLocaleString()})`
            )
            .setStyle(ButtonStyle.Primary)
        );
      }

      // 버튼을 5개씩 나눠서 ActionRow에 배치
      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      for (let i = 0; i < buttons.length; i += 5) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          buttons.slice(i, i + 5)
        );
        rows.push(row);
      }

      await searchingMsg.edit({
        content: `🔍 **${nickname}** 검색 결과 - 서버를 선택하세요:`,
        components: rows,
      });
      console.log(`✅ [MessageCreate] 버튼 표시 완료`);
    } catch (error) {
      console.error("❌ [MessageCreate] 에러 발생:", error);
      await message.reply(`❌ **${nickname}** 캐릭터를 찾을 수 없습니다.`);
    }
    console.log(`🏁 [MessageCreate] 검색 처리 종료`);
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