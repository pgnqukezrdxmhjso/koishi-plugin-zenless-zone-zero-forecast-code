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
  const cronTask = async () => {
    try {
      const rows =
        await ctx.messageTopicService.getTopicSubscribeByTopic(topic);
      if (rows.length < 1) {
        return;
      }
      let actData = await Code.getActData({ http: ctx.http });
      let dtStartTime = actData.data.dtStartTime;
      if (dtStartTime) {
        const startTime = new Date(dtStartTime).getTime();
        const time = Date.now();
        if (startTime > time || startTime < time - 24 * 60 * 60 * 1000) {
          return;
        }
      }
      ctx.messageTopicService
        .sendMessageToTopic(topic, Code.actDataToMsg(actData))
        .then();
    } catch (e) {
      ctx.logger.error(e);
    }
  };
  ctx.cron("0 13 * * *", cronTask);
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
