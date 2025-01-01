import { HTTP } from "koishi";

const DefaultHeads = {
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  Origin: "https://www.miyoushe.com",
  Referer: "https://www.miyoushe.com/",
};
const DefaultHeads2 = {
  ...DefaultHeads,
  Origin: "https://webstatic.mihoyo.com",
  Referer: "https://webstatic.mihoyo.com/",
};

const getUrl = async ({
  http,
  url,
  heads = {},
  type = 0,
  data,
}: {
  http: HTTP;
  url: string;
  heads?: {};
  type?: 0 | 1;
  data?: any;
}) => {
  const config = {
    headers: {
      ...(type === 0 ? DefaultHeads : DefaultHeads2),
      ...heads,
    },
  };
  let res: any;
  if (!data) {
    res = await http.get(url, config);
  } else {
    res = await http.post(url, data, config);
  }
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
      url: "https://bbs-api.miyoushe.com/misc/wapi/getUniversalNavigators",
      data: '{"game_id":8,"types":[4]}',
    });
    const list: any[] = data?.list?.[0]?.navigators || [];
    const target = list.filter(
      (item) =>
        item?.name.includes("前瞻") &&
        (item?.web_path?.includes("act_id=") ||
          item?.app_path?.includes("act_id=")),
    )[0];
    if (!target) {
      throw { eMsg: "没有获取到前瞻信息" };
    }
    const actId = new URL(
      target?.web_path?.includes("act_id=") ? target.web_path : target.app_path,
    ).searchParams.get("act_id");
    return {
      actId,
      data: target,
    };
  },
  async getCode({ http, actId }: { http: HTTP; actId: string }) {
    const data = await getUrl({
      http,
      type: 1,
      url: "https://api-takumi.mihoyo.com/event/miyolive/index",
      heads: {
        "x-rpc-act_id": actId,
      },
    });
    const codeVer = data?.live?.code_ver;
    if (!codeVer) {
      throw { eMsg: "没有获取到前瞻信息..." };
    }
    const codeData = await getUrl({
      http,
      type: 1,
      url: `https://api-takumi-static.mihoyo.com/event/miyolive/refreshCode?version=${codeVer}&time=${(Date.now() + "").replace(/\d{3}$/, "").length}`,
      heads: {
        "x-rpc-act_id": actId,
      },
    });
    const codeList: any[] = codeData.code_list || [];
    if (!codeList || codeList.length < 1) {
      throw { eMsg: "没有获取到兑换码" };
    }
    let msg = "";
    codeList.forEach((item) => {
      if(item.code){
        msg += item.code + "\n";
      }
    });
    if (msg.length < 1) {
      throw { eMsg: "没有获取到兑换码" };
    }
    return msg;
  },
  async get({ http }: { http: HTTP }): Promise<string> {
    const { actId } = await Code.getActData({ http });
    return await Code.getCode({ http, actId });
  },
};

export default Code;
