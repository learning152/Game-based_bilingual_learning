# 百度文心一言 API 使用示例
# 请安装 OpenAI SDK : pip install openai
# apiKey 获取地址： https://console.bce.baidu.com/iam/#/iam/apikey/list
# 支持的模型列表： https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Fm2vrveyu

from openai import OpenAI

client = OpenAI(
    base_url='https://qianfan.baidubce.com/v2',
    api_key=''  # 请填入您的API密钥
)

response = client.chat.completions.create(
    model="ernie-3.5-8k",  # 使用文心一言 3.5-8k 模型
    messages=[
        {
            "role": "user",
            "content": "您好"
        }
    ],
    extra_body={ 
        "web_search": {
            "enable": False,
            "enable_citation": False,
            "enable_trace": False
        }
    }
)

print(response)