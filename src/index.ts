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
      let { data } = await Code.getActData({ http: ctx.http });
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
