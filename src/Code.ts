import { HTTP } from "koishi";

const DefaultHeads = {
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  Origin: "https://zenless.hoyoverse.com",
  Referer: "https://zenless.hoyoverse.com/",
};
const getUrl = async ({
  http,
  url,
  heads = {},
}: {
  http: HTTP;
  url: string;
  heads?: {};
}) => {
  const config = {
    headers: {
      ...DefaultHeads,
      ...heads,
    },
  };
  const res = await http.get(url, config);
  if (res.retcode + "" !== "0") {
    const error = new Error(JSON.stringify(res));
    error["eMsg"] = res.message;
    throw error;
  }
  return res.data;
};
const Code = {
  async getActData({ http }: { http: HTTP }) {
    const data = await getUrl({
      http,
      url: "https://sg-public-api-static.hoyoverse.com/content_v2_user/app/3e9196a4b9274bd7/getContentList?iPageSize=9&iPage=1&iChanId=295&sLangKey=en-us",
    });
    const list: any[] = data?.list || [];
    const target = list.filter((item) => {
      const sIntro = (item?.sIntro || "").toLowerCase();
      return (
        sIntro.includes("zenless zone zero") &&
        sIntro.includes("version") &&
        sIntro.includes("19:30")
      );
    })[0];
    if (!target) {
      throw { eMsg: "没有获取到前瞻信息" };
    }
    const sIntro = target.sIntro as string;
    const name = sIntro.match(/"([^"]+)"/)?.[1];
    const day = sIntro.replace(/19:30|\+8/g, "").match(/(\d+)\D*$/)?.[1];
    return {
      name: name,
      day: day,
      data: target,
    };
  },
  actDataToMsg(data: { name: string; day: string; data: any }) {
    let msg = "";
    if (data.day) {
      msg += data.day + "号开播\n";
    }
    if (data.name) {
      msg += "版本名: " + data.name + "\n";
      msg +=
        "可能的兑换码: " +
        data.name.toUpperCase().replace(/\s/g, "").replace(/&/g, "N") +
        "\n";
    }
    msg += "兑换码大概率是版本名全大写，去除空格，符号&换成字母N\n";
    msg += data.data.sIntro;
    return msg;
  },
  async get({ http }: { http: HTTP }): Promise<string> {
    const data = await Code.getActData({ http });
    return Code.actDataToMsg(data);
  },
};

export default Code;
