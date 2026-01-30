export const PERSONALIZED_WELCOME_EMAIL_PROMPT = `生成高度个性化的 HTML 内容，这些内容将被插入邮件模板的 {{intro}} 占位符中。

用户档案数据：
{{userProfile}}

个性化要求：
你必须创建明显针对该特定用户的内容，通过以下方式：

重要：请勿以“欢迎”开头，因为邮件标题已经包含了“欢迎加入 {{name}}”。请使用其他的开场白，如“感谢加入”、“很高兴见到你”、“你已设置完毕”、“时机正合适”等。

1. **直接引用用户详情**：提取并使用其档案中的特定信息：
   - 他们的确切投资目标或目的
   - 他们所述的风险承受能力水平
   - 提到的首选行业/部门
   - 他们的经验水平或背景
   - 他们感兴趣的特定股票/公司
   - 他们的投资时间轴（短期、长期、退休）

2. **背景化消息**：创建显示你理解他们情况的内容：
   - 新手投资者 → 提到学习/开始他们的旅程
   - 资深交易者 → 提到高级工具/策略增强
   - 退休规划 → 提到长期财富积累
   - 特定行业 → 直接点名这些行业
   - 保守策略 → 提到安全性和知情决策
   - 激进策略 → 提到机会和增长潜力

3. **个人化触达**：让内容感觉是专门为他们编写的：
   - 在消息中使用他们的目标
   - 直接引用其兴趣
   - 将功能与其特定需求联系起来
   - 让他们感到被理解和被重视

核心格式要求：
- 仅返回纯 HTML 内容，不得包含 Markdown、代码块或反引号
- 仅限单个段落：<p class="mobile-text" style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">内容</p>
- 准确编写两句话
- 总字数保持在 60-100 个中文字符之间，以保证可读性
- 对关键的个性化元素（目标、行业等）使用 <strong> 标签
- 不要包含“你现在可以做以下事情：”，因为这已包含在模板中
- 每一句话都要体现出个性化
- 第二句话应增加有用的背景信息或强化个性化内容

个性化输出示例（展示明显的定制化且包含两句话）：
<p class="mobile-text" style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">感谢加入 OpenStock！作为一名关注 <strong>科技成长股</strong> 的投资者，您一定会喜欢我们为您追踪的公司提供的实时提醒。我们将帮助您在这些机会成为主流新闻之前及时发现它们。</p>

<p class="mobile-text" style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">很高兴您能加入！这非常适合您的 <strong>保守型退休策略</strong> —— 我们将帮助您监控红利股，而不会让海量信息淹没您。您终于可以满怀信心地追踪您的组合进度了。</p>

<p class="mobile-text" style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">您已设置完毕！由于您是投资领域的新手，我们设计了简单的工具来帮助您建立信心，并学习您感兴趣的 <strong>医疗保健行业</strong>。我们的入门级提醒将引导您避开那些令人困惑的专业术语。</p>`

export const NEWS_SUMMARY_EMAIL_PROMPT = `生成市场新闻摘要的 HTML 内容，将被插入 NEWS_SUMMARY_EMAIL_TEMPLATE 的 {{newsContent}} 占位符中。

待汇总的新闻数据：
{{newsData}}

核心格式要求：
- 仅返回纯 HTML 内容，不得包含 Markdown、代码块或反引号
- 使用正确的 HTML 标题和段落结构化内容
- 使用邮件模板指定的 CSS 类和样式：

板块标题（用于“市场亮点”、“涨幅榜”等类别）：
<h3 class="mobile-news-title dark-text" style="margin: 30px 0 15px 0; font-size: 18px; font-weight: 600; color: #f8f9fa; line-height: 1.3;">板块标题</h3>

段落（用于新闻内容）：
<p class="mobile-text dark-text-secondary" style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">新闻内容</p>

股票/公司提及：
<strong style="color: #FDD458;">股票代码</strong> 用于股票代码
<strong style="color: #CCDADC;">公司名称</strong> 用于公司名称

表现指标：
上涨使用 📈，下跌使用 📉，持平/混合使用 📊

新闻文章结构：
对于每个新闻条目，请使用以下结构：
1. 带样式和图标的文章容器
2. 作为子标题的文章标题
3. 关键要点（2-3 条可执行的见解）
4. “这对您意味着什么”背景说明
5. 原文阅读链接
6. 文章间的视觉分隔符

文章容器：
将每篇文章包裹在简洁的容器中：
<div class="dark-info-box" style="background-color: #212328; padding: 24px; margin: 20px 0; border-radius: 8px;">

文章标题：
<h4 class="dark-text" style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #FFFFFF; line-height: 1.4;">
文章标题在此
</h4>

要点列表（至少 3 条简洁见解）：
使用此格式进行清晰、简洁的解释：
<ul style="margin: 16px 0 20px 0; padding-left: 0; margin-left: 0; list-style: none;">
  <li class="dark-text-secondary" style="margin: 0 0 16px 0; padding: 0; margin-left: 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">
    <span style="color: #FDD458; font-weight: bold; font-size: 20px; margin-right: 8px;">•</span>简单易懂的解释，方便快速阅读。
  </li>
  <li class="dark-text-secondary" style="margin: 0 0 16px 0; padding: 0; margin-left: 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">
    <span style="color: #FDD458; font-weight: bold; font-size: 20px; margin-right: 8px;">•</span>包含关键数字的简短说明，并用通俗易懂的语言解释其含义。
  </li>
  <li class="dark-text-secondary" style="margin: 0 0 16px 0; padding: 0; margin-left: 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">
    <span style="color: #FDD458; font-weight: bold; font-size: 20px; margin-right: 8px;">•</span>关于这则消息对普通用户资产影响的简单总结。
  </li>
</ul>

见解板块：
添加简单的背景解释：
<div style="background-color: #141414; border: 1px solid #374151; padding: 15px; border-radius: 6px; margin: 16px 0;">
<p class="dark-text-secondary" style="margin: 0; font-size: 14px; color: #CCDADC; line-height: 1.4;">💡 <strong style="color: #FDD458;">核心总结:</strong> 此消息对个人财务影响的通俗解释。</p>
</div>

阅读原文按钮：
<div style="margin: 20px 0 0 0;">
<a href="ARTICLE_URL" style="color: #FDD458; text-decoration: none; font-weight: 500; font-size: 14px;" target="_blank" rel="noopener noreferrer">阅读全文 →</a>
</div>

区块分隔：
关闭文章容器：
</div>

板块分隔符：
主要板块之间使用：
<div style="border-top: 1px solid #374151; margin: 32px 0 24px 0;"></div>

内容指南：
- 将新闻组织进带图标的逻辑板块（📊 市场概览、📈 涨幅最高、📉 跌幅最高、🔥 突发新闻、💼 财报发布、🏛️ 经济数据等）
- 严禁重复板块标题 - 每封邮件中每个板块类型仅限使用一次
- 每篇新闻必须包含数据中实际的标题
- 至少提供 3 条简洁的要点（不要加“关键要点”标签 - 直接开始列点）
- 每条要点必须短促且易于理解 - 最好只有一句话
- 使用直白的中文 - 避免使用过于专业的术语或内部行话
- 像是跟投资新手交谈一样解释概念
- 包含具体数字，但要解释其现实意义
- 添加通俗易懂的“核心总结”
- 保持布局清晰，使用黄色列表点以提高可读性
- 始终包含带实际 URL 的“阅读全文”按钮
- 重点关注普通用户能理解并使用的实际见解
- 语言风格保持口语化，面向所有人
- 简洁明了优于详细解释

示例结构：
<h3 class="mobile-news-title dark-text" style="margin: 30px 0 15px 0; font-size: 20px; font-weight: 600; color: #f8f9fa; line-height: 1.3;">📊 市场概览</h3>

<div class="dark-info-box" style="background-color: #212328; padding: 24px; margin: 20px 0; border-radius: 8px;">
<h4 class="dark-text" style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #FDD458; line-height: 1.4;">
今日股市涨跌互现
</h4>

<ul style="margin: 16px 0 20px 0; padding-left: 0; margin-left: 0; list-style: none;">
  <li class="dark-text-secondary" style="margin: 0 0 16px 0; padding: 0; margin-left: 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">
    <span style="color: #FDD458; font-weight: bold; font-size: 20px; margin-right: 8px;">•</span>苹果等科技股今日上涨 1.2%，这对科技股投资者来说是个好消息。
  </li>
  <li class="dark-text-secondary" style="margin: 0 0 16px 0; padding: 0; margin-left: 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">
    <span style="color: #FDD458; font-weight: bold; font-size: 20px; margin-right: 8px;">•</span>传统企业下跌 0.3%，表明投资者目前更青睐科技板块。
  </li>
  <li class="dark-text-secondary" style="margin: 0 0 16px 0; padding: 0; margin-left: 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">
    <span style="color: #FDD458; font-weight: bold; font-size: 20px; margin-right: 8px;">•</span>124 亿股的高成交量显示市场情绪活跃且充满信心。
  </li>
</ul>

<div style="background-color: #141414; border: 1px solid #374151; padding: 15px; border-radius: 6px; margin: 16px 0;">
<p class="dark-text-secondary" style="margin: 0; font-size: 14px; color: #CCDADC; line-height: 1.4;">💡 <strong style="color: #FDD458;">核心总结:</strong> 如果您持有科技股，今天是不错的一天。如果您考虑投资，科技公司目前可能是明智的选择。</p>
</div>

<div style="margin: 20px 0 0 0;">
<a href="https://example.com/article1" style="color: #FDD458; text-decoration: none; font-weight: 500; font-size: 14px;" target="_blank" rel="noopener noreferrer">阅读全文 →</a>
</div>
</div>`

export const TRADINGVIEW_SYMBOL_MAPPING_PROMPT = `你是一名金融市场和交易平台专家。你的任务是找到对应于给定 Finnhub 股票代码的正确 TradingView 代码。

Finnhub 提供的股票信息：
代码: {{symbol}}
公司: {{company}}
交易所: {{exchange}}
币种: {{currency}}
国家: {{country}}

重要规则：
1. TradingView 使用特定的代码映射格式，可能与 Finnhub 不同
2. 对于美股：通常直接使用代码（例如苹果为 AAPL）
3. 对于国际股票：通常包含交易所前缀（例如 NASDAQ:AAPL, NYSE:MSFT, LSE:BARC）
4. 部分代码可能包含不同股份类别的后缀
5. ADRs 和海外股票可能有不同的代码格式

响应格式：
仅返回一个符合此结构的有效 JSON 对象：
{
  "tradingViewSymbol": "EXCHANGE:SYMBOL",
  "confidence": "high|medium|low",
  "reasoning": "简要解释为什么此映射是正确的"
}

示例：
- Apple Inc. (AAPL) from Finnhub → {"tradingViewSymbol": "NASDAQ:AAPL", "confidence": "high", "reasoning": "Apple trades on NASDAQ as AAPL"}
- Microsoft Corp (MSFT) from Finnhub → {"tradingViewSymbol": "NASDAQ:MSFT", "confidence": "high", "reasoning": "Microsoft trades on NASDAQ as MSFT"}
- Barclays PLC (BARC.L) from Finnhub → {"tradingViewSymbol": "LSE:BARC", "confidence": "high", "reasoning": "Barclays trades on London Stock Exchange as BARC"}

你的响应必须仅包含有效的 JSON。不要包含任何其他文本。`
