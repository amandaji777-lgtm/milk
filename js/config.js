/*应用常量与数据结构*/

        const APP_PREFIX = 'CHAT_APP_V3_';
        const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
        const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
        const MESSAGES_PER_PAGE = 50;
        
        const CONSTANTS = {
            HEADER_MOTTOS: [],
            WELCOME_ANIMATIONS: [
                {
                    line1: "♡ 爱 ♡",
                    line2: "✧ 正在连接我们的思绪 ✧"
                },
                {
                    line1: "𝑳𝒐𝒗𝒆",
                    line2: "若要由我来谈论爱的话"
                },
                {
                    line1: "𝚂𝚘𝚞𝚕𝚖𝚊𝚝𝚎",
                    line2: "灵魂正在共振"
                },
                {
                    line1: "✦ 相遇 ✦",
                    line2: "在万千人海中遇见你"
                },
                {
                    line1: "Destiny",
                    line2: "命运的红线将我们相连"
                },
                {
                    line1: "Memory",
                    line2: "创造属于我们的回忆"
                },
                {
                    line1: "未来",
                    line2: "一起走向的未来"
                },
                {
                    line1: "希望",
                    line2: "你就是我的希望"
                },
                {
                    line1: "光",
                    line2: "你是我生命中的光"
                },
                {
                    line1: "量子纠缠",
                    line2: "超越距离的默契"
                },
                {
                    line1: "星轨",
                    line2: "交汇时互放的光亮"
                },
                {
                    line1: "花火",
                    line2: "刹那即永恒的光芒"
                },
                {
                    line1: "初雪",
                    line2: "纯洁无瑕的爱意"
                },
                {
                    line1: "一期一会",
                    line2: "一生一次的邂逅"
                },
                {
                    line1: "桃源郷",
                    line2: "只属于两人的乐土"
                },
            ],
            WELCOME_ICONS: [
                "fas fa-heart", "fas fa-star", "fas fa-moon", "fas fa-sun", "fas fa-cloud", "fas fa-feather", "fas fa-book", "fas fa-pen", "fas fa-key", "fas fa-compass", "fas fa-leaf", "fas fa-fire", "fas fa-snowflake", "fas fa-bell", "fas fa-gem", "fas fa-crown", "fas fa-feather-alt", "fas fa-hat-wizard", "fas fa-ring", "fas fa-scroll", "fas fa-dove", "fas fa-cat", "fas fa-seedling", "fas fa-tree", "fas fa-mountain", "fas fa-wind", "fas fa-meteor", "fas fa-rocket"
            ],
            PARTNER_STATUSES: [],
            REPLY_MESSAGES: [],
            REPLY_EMOJIS: [],
            POKE_ACTIONS: [],
            TAROT_CARDS: [
                { name: "愚人", eng: "The Fool", meaning: "新的开始、冒险、天真、无畏", keyword: "流浪", icon: "fa-hiking" },
                { name: "魔术师", eng: "The Magician", meaning: "创造力、技能、意志力、化腐朽为神奇", keyword: "创造", icon: "fa-hat-wizard" },
                { name: "女祭司", eng: "The High Priestess", meaning: "直觉、潜意识、神秘、智慧", keyword: "智慧", icon: "fa-book-open" },
                { name: "女帝", eng: "The Empress", meaning: "丰饶、母性、自然、感官享受", keyword: "丰收", icon: "fa-seedling" },
                { name: "皇帝", eng: "The Emperor", meaning: "权威、结构、控制、父亲形象", keyword: "支配", icon: "fa-crown" },
                { name: "教皇", eng: "The Hierophant", meaning: "传统、信仰、教导、精神指引", keyword: "援助", icon: "fa-church" },
                { name: "恋人", eng: "The Lovers", meaning: "爱、和谐、关系、价值观的选择", keyword: "结合", icon: "fa-heart" },
                { name: "战车", eng: "The Chariot", meaning: "意志力、胜利、决心、自我控制", keyword: "胜利", icon: "fa-horse-head" },
                { name: "力量", eng: "Strength", meaning: "勇气、耐心、控制、内在力量", keyword: "意志", icon: "fa-fist-raised" },
                { name: "隐士", eng: "The Hermit", meaning: "内省、孤独、寻求真理、指引", keyword: "探索", icon: "fa-lightbulb" },
                { name: "命运之轮", eng: "Wheel of Fortune", meaning: "循环、命运、转折点、运气", keyword: "轮回", icon: "fa-dharmachakra" },
                { name: "正义", eng: "Justice", meaning: "公正、真理、因果、法律", keyword: "均衡", icon: "fa-balance-scale" },
                { name: "倒吊人", eng: "The Hanged Man", meaning: "牺牲、新的视角、等待、放下", keyword: "奉献", icon: "fa-user-injured" },
                { name: "死神", eng: "Death", meaning: "结束、转变、重生、放手", keyword: "结束", icon: "fa-skull" },
                { name: "节制", eng: "Temperance", meaning: "平衡、适度、耐心、调和", keyword: "净化", icon: "fa-glass-whiskey" },
                { name: "恶魔", eng: "The Devil", meaning: "束缚、物质主义、欲望、诱惑", keyword: "诱惑", icon: "fa-link" },
                { name: "高塔", eng: "The Tower", meaning: "突变、混乱、启示、破坏", keyword: "毁灭", icon: "fa-gopuram" },
                { name: "星星", eng: "The Star", meaning: "希望、灵感、平静、治愈", keyword: "希望", icon: "fa-star" },
                { name: "月亮", eng: "The Moon", meaning: "幻觉、恐惧、焦虑、潜意识", keyword: "不安", icon: "fa-moon" },
                { name: "太阳", eng: "The Sun", meaning: "快乐、成功、活力、清晰", keyword: "生命", icon: "fa-sun" },
                { name: "审判", eng: "Judgement", meaning: "复活、觉醒、号召、决定", keyword: "复活", icon: "fa-bullhorn" },
                { name: "世界", eng: "The World", meaning: "完成、整合、成就、圆满", keyword: "达成", icon: "fa-globe-americas" }
            ]
        };

window.APP_PREFIX = APP_PREFIX;
