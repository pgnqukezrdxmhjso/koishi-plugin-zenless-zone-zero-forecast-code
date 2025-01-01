import { Context, Schema } from "koishi";
// noinspection ES6UnusedImports
import {} from "koishi-plugin-message-topic-service";
// noinspection ES6UnusedImports
import {} from "koishi-plugin-cron";
import Code from "./Code";

export const name = "zenless-zone-zero-forecast-code";

export const inject = ["messageTopicService", "cron"];

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

export function apply(ctx: Context) {
  const topic = "绝区零.前瞻.开播";
  ctx.messageTopicService.registerTopic(topic).then();
  const todayActData = async () => {
    const rows = await ctx.messageTopicService.getTopicSubscribeByTopic(topic);
    if (rows.length < 1) {
      return;
    }
    return await Code.getActData({ http: ctx.http });
  };
  const cronTask = async () => {
    try {
      let { data } = await todayActData();
      ctx.messageTopicService
        .sendMessageToTopic(
          topic,
          "绝区零前瞻直播开始了\n" +
            (data?.web_path?.includes("act_id=")
              ? data.web_path
              : data.app_path),
        )
        .then();
    } catch (e) {
      ctx.logger.error(e);
    }
  };
  ctx.cron("1 19 * * *", cronTask);

  (async () => {
    const date = new Date();
    if (
      date.getHours() < 19 ||
      (date.getHours() === 19 && date.getMinutes() < 15)
    ) {
      return;
    }
    try {
      const actData = await todayActData();
      if (!actData) {
        return;
      }
      startWatch();
    } catch (e) {
      ctx.logger.error(e);
    }
  })();

  let watchDayStart: number = null;
  let watchDayEnd: number = null;
  const startWatch = () => {
    const nowS = new Date();
    const nowE = new Date();
    nowS.setHours(0, 0, 0, 0);
    nowE.setHours(23, 59, 59, 999);
    watchDayStart = nowS.getTime();
    watchDayEnd = nowE.getTime();
    watch();
  };

  const watch = () => {
    ctx.setTimeout(
      async () => {
        const time = Date.now();
        if (time < watchDayStart || watchDayEnd < time) {
          return;
        }
        try {
          const msg = await Code.get({ http: ctx.http });
          ctx.messageTopicService
            .sendMessageToTopic(topic, "绝区零兑换码\n" + msg)
            .then();
          return;
        } catch (e) {
          ctx.logger.debug(e);
        }
        watch();
      },
      5 * 60 * 1000,
    );
  };

  ctx.command("绝区零前瞻订阅").action(async ({ session }) => {
    await ctx.messageTopicService.topicSubscribe({
      platform: session.bot.platform,
      selfId: session.bot.selfId,
      channelId: session.channelId,
      bindingKey: topic,
      enable: true,
    });
    return "订阅成功";
  });
  ctx.command("绝区零前瞻不订阅").action(async ({ session }) => {
    await ctx.messageTopicService.topicSubscribe({
      platform: session.bot.platform,
      selfId: session.bot.selfId,
      channelId: session.channelId,
      bindingKey: topic,
      enable: false,
    });
    return "不订阅成功";
  });
  ctx.command("绝区零前瞻").action(async ({ session }) => {
    try {
      const msg = await Code.get({ http: ctx.http });
      await session.send(msg);
    } catch (e) {
      ctx.logger.error(e);
      await session.send(e.eMsg ? e.eMsg : "获取失败");
    }
  });
}
