# Web 应用互动引导实战指南 (Product Tour & Hero Demo Guide)

本文档总结了在本项目中使用的整套“用户破冰引导”的落地方案。可以作为后续同类型（甚至不同技术栈） Web 应用项目添加引导功能或落地页增强的快捷参考。

## 方案架构概述

一套完整的转化引导至少包含两部分核心：
1. **视觉强化层面**: 位于主页首屏 (Hero Demo)，通过自动动画展现核心价值。
2. **交互教学层面**: 位于应用区域 (Guided Tour)，通过交互式高亮告诉用户如何使用工具。

---

## 一、首屏 Hero Demo（无尽循环对比擦除动画）

我们避免了使用笨重的 `GIF` 或 `Video`，而是使用真实的图片配合高性能纯 CSS `clip-path` 实现了非常丝滑的“去除处理对比效果”。

### 特性亮点
*   网速和性能友好：通过叠加原图和对比图、完全硬件加速。
*   定制宽高比裁切：使用 `object-cover` 和 `object-bottom` 对齐高关键特征（如底部的水印），而不是盲目居中裁切。

### 代码实现演示 (HTML & CSS)

```html
<!-- Hero Demo 视窗基座 (长宽比2.5:1) -->
<div class="max-w-3xl mx-auto mb-4 relative rounded-2xl overflow-hidden shadow-lg border border-gray-100/50 aspect-[2.5/1]">
  
  <!-- 底层 (Before Image) -->
  <img src="before.webp" class="absolute inset-0 w-full h-full object-cover object-bottom" />

  <!-- 表层 (After Image) & 裁切动画 -->
  <img src="after.webp" 
       class="absolute inset-0 w-full h-full object-cover object-bottom z-10" 
       style="animation: wipe-image 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;" />

  <!-- 扫描发光条动画层 (与表层同步) -->
  <div class="absolute inset-0 z-20" style="animation: wipe-bar-container 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;">
      <div class="absolute right-0 top-0 bottom-0 w-[2px] bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.8)] z-30"></div>
      <div class="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-r from-transparent to-emerald-400/20 z-20"></div>
  </div>

  <style>
    /* CSS 控制 clip-path 裁切边界 */
    @keyframes wipe-image {
      0%, 15% { clip-path: inset(0 100% 0 0); } /* 图像不可见，只展示右侧边缘 */
      85%, 100% { clip-path: inset(0 0 0 0); } /* 全部显示 */
    }
    
    /* 发光条组伴随裁切边界一致移动 */
    @keyframes wipe-bar-container {
      0%, 15% { transform: translateX(-100%); }
      85%, 100% { transform: translateX(0%); }
    }
  </style>
</div>
```

---

## 二、互动式操作高亮引导 (Interactive Tour)

我们采用了轻量级（无依赖）浏览器级弹窗提示库 **[Driver.js](https://driverjs.com/)**，它拥有极其方便的 API 可覆盖大部分交互诉求。

### 引入依赖
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css" />
<script src="https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.js.iife.js"></script>
```

### 初始化逻辑 (JavaScript)

推荐绑定到一个显眼的 "立即开始体验" Action 按钮上。

```javascript
let driverObj = null;

function startTour() {
    // 根据具体业务可以结合 i18n 多语言库动态传入配置
    const config = {
        showProgress: true, // 在弹框显示: 1 of 2
        animate: true,
        allowClose: true,
        doneBtnText: '完成',
        nextBtnText: '下一步',
        prevBtnText: '上一步',
        steps: [
            {
                element: '#uploadBoxCenter', // 目标高亮控件的 DOM 选择器
                popover: {
                    title: '第一步：业务操作区',
                    description: '请在这里进行核心交互',
                    side: 'bottom', // 弹窗停靠方位
                    align: 'center' // 弹窗对齐方式
                }
            },
            {
                element: '#downloadBtn',
                popover: {
                    title: '最后一步：下载成果',
                    description: '点击对应的按钮即可获得结果',
                    side: 'left',
                    align: 'start'
                }
            }
        ]
    };

    if (!driverObj) {
        // 全局第一次初始化
        driverObj = window.driver.js.driver(config);
    } else {
        // 重复调用时，刷新绑定和语境配置
        driverObj.setConfig(config);
        driverObj.setSteps(config.steps);
    }
    
    // (可选) 为提升体验，可平滑滚动至首个操作元素区域后再启动 Tour 阻断遮罩
    document.getElementById('workspace').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => driverObj.drive(), 500); // .drive() 默认从第0手开始
}
```

### 深度自定义 Driver 主题 (CSSOverrides)

可以通过覆盖官方 class 实现和网站 UI 极度一致的弹窗：
```css
/* 覆写黑夜模式拟物态玻璃风格例子 */
.driver-popover.driverjs-theme {
  background-color: #0F172A;
  color: #F8FAFC;
  border-radius: 1rem;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  padding: 20px;
}
.driver-popover.driverjs-theme .driver-popover-title {
  color: #fff;
  font-weight: 700;
}
.driver-popover.driverjs-theme .driver-popover-description {
  color: #94A3B8;
  margin-top: 8px;
}
.driver-popover.driverjs-theme button {
  background-color: #334155;
  border-radius: 0.5rem;
  color: #fff;
}
/* 修改三角形指示箭头的颜色使其与背景融合 */
.driver-popover.driverjs-theme .driver-popover-arrow-side-bottom.driver-popover-arrow {
  border-bottom-color: #0F172A;
}
```

## 三、部署注意事项与优化建议

* **素材压缩**：Hero Demo 图建议输出为 `.webp` 格式替代 `.png`，可以减少超过 70% 的体积。
* **DOM 脱离**：配置 `Driver.js` 时使用静态不变的选择器。如果目标组件是通过第三方框架(Vue/React)根据条件动态隐现的，在 `drive()` 执行之时要确保这些控件已经实际渲染到了屏幕上，否则引导可能会跳步。
* **多次触发机制**：通常可以在全局加上判断标识 `localStorage.getItem('saw-tour')` 判定是否要强制弹窗；但在显眼的 "引导按钮" 上总是绑定手动显式触发。
