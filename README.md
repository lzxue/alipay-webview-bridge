# alipay-webview-bridge

H5 WebView 与支付宝小程序双向通信适配器。在小程序 WebView 中的 H5 页面里，像调用原生 API 一样调用支付宝小程序能力。

## 安装

```bash
npm install alipay-webview-bridge
```

## 使用

### H5 端 (WebView 页面)

**ESM:**

```ts
import { init, requestAuthCode, getLocation } from 'alipay-webview-bridge/h5';

await init();
const res = await requestAuthCode('auth_base');
console.log(res.authCode);
```

**UMD (script 标签):**

```html
<script src="node_modules/alipay-webview-bridge/dist/h5/index.umd.js"></script>
<script>
  const SDK = window.AlipayBridge;
  SDK.init().then(() => {
    SDK.requestAuthCode('auth_base').then(res => console.log(res.authCode));
  });
</script>
```

### 小程序端

```js
// pages/webview/webview.js
const { createBridgeProxy } = require('alipay-webview-bridge/miniprogram');

Page({
  data: { webUrl: 'https://your-h5-page.com' },
  onLoad() {
    this.proxy = createBridgeProxy(this);
  },
  onWebViewMessage(e) {
    this.proxy.handleMessage(e);
  },
});
```

```xml
<!-- pages/webview/webview.axml -->
<web-view id="web-view" src="{{webUrl}}" onMessage="onWebViewMessage" />
```

## 支持的 API

| 类别 | H5 方法 | 说明 |
|------|---------|------|
| 授权 | `requestAuthCode(scopes)` | 获取授权码 |
| 定位 | `requestLocation(type)` | 获取位置 |
| 震动 | `requestVibrate(type)` | 设备震动 |
| 导航栏 | `setNavbar(params)` | 设置导航栏 |
| Toast | `showToast / showLoading / hideLoading` | 轻提示 |
| 弹窗 | `alert / confirm / showActionSheet` | 交互弹窗 |
| 系统 | `getSystemInfo / getNetworkType / getBatteryInfo` | 系统信息 |
| 存储 | `setStorage / getStorage / removeStorage` | 数据缓存 |
| 剪贴板 | `setClipboard / getClipboard` | 剪贴板操作 |
| 扫码 | `scan(type)` | 扫码 |
| 电话 | `makePhoneCall(number)` | 拨打电话 |
| 图片 | `chooseImage / previewImage / saveImage` | 图片操作 |
| 传感器 | `startAccelerometer / startGyroscope / startCompass` | 硬件传感器 |
| 蓝牙 | `openBluetoothAdapter / getBluetoothAdapterState / ...` | BLE |
| WiFi | `startWifi / getConnectedWifi / connectWifi` | WiFi |
| 生物认证 | `checkBioAuthMode / startBioAuth` | 指纹/面容 |
| 导航 | `navigateTo / navigateBack / navigateToMiniProgram` | 路由跳转 |
| 支付 | `tradePay(tradeNO)` | 小程序支付 |
| HTTP | `httpRequest(params)` | 网络请求代理 |

## 自定义扩展

小程序端支持注册自定义 API：

```js
proxy.registerApi('myCustomApi', {
  responseType: 'myCustomApi_response',
  handler: async (data, ctx) => {
    // 处理逻辑
    return { result: 'ok' };
  },
});
```

H5 端调用：

```ts
const res = await sendAsync('myCustomApi', { foo: 'bar' });
```

## 构建

```bash
npm run build    # 构建产物到 dist/
npm run dev      # watch 模式
npm run clean    # 清理 dist/
```

## 产物结构

```
dist/
├── h5/
│   ├── index.esm.js     # ES Module
│   ├── index.cjs.js     # CommonJS
│   ├── index.umd.js     # UMD (global: AlipayBridge)
│   └── index.d.ts       # TypeScript 类型声明
└── miniprogram/
    ├── index.esm.js
    ├── index.cjs.js
    └── index.d.ts
```

## License

MIT
