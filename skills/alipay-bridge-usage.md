---
name: alipay-bridge-usage
description: "Generate integration code for `alipay-webview-bridge` SDK — the H5-to-Alipay-miniprogram communication bridge. Use this skill whenever the user asks about: calling miniprogram APIs from H5 WebView pages, setting up postMessage communication between H5 and Alipay miniprogram, using AlipayBridge SDK, integrating webview bridge in their project, handling miniprogram-to-H5 push events, or registering custom bridge APIs. Also trigger when users reference this project's SDK (alipay-webview-bridge, AlipayBridge) or ask how to use specific bridge methods like requestAuthCode, requestLocation, sendAsync, createBridgeProxy, etc."
---

# alipay-webview-bridge Usage Guide

This skill generates correct integration code for the `alipay-webview-bridge` SDK, which enables H5 pages running inside Alipay miniprogram WebView to call native miniprogram capabilities via a postMessage-based bridge.

## Architecture Overview

The SDK has two sides that work together:

1. **H5 SDK** (`alipay-webview-bridge/h5`) — runs in the WebView page, sends requests via `my.postMessage` and listens for responses via `my.onMessage`
2. **Miniprogram Proxy** (`alipay-webview-bridge/miniprogram`) — runs in the miniprogram Page, receives messages from WebView, calls `my.xxx` APIs, and posts results back

Communication protocol:
- H5 → Mini: `my.postMessage({ type: 'apiName', ...params })`
- Mini → H5: `webViewContext.postMessage({ type: 'apiName_response', status: 'success'|'fail', ...data })`

## H5 Side

The `init()` method automatically loads the Alipay WebView JSBridge (`https://appx/web-view.min.js`) dynamically — no manual script tag needed. After `init()` resolves, all APIs are available.

### ESM Usage

```ts
import {
  init, isInMiniprogram,
  requestAuthCode, requestLocation, requestVibrate,
  setNavbar, showToast, showLoading, hideLoading, alert, confirm,
  getSystemInfo, getNetworkType,
  setStorage, getStorage, removeStorage,
  setClipboard, getClipboard,
  scan, makePhoneCall, chooseImage,
  sendAsync, on, once,
} from 'alipay-webview-bridge/h5';

// init() dynamically loads JSBridge and registers my.onMessage listener
await init();

// Auth
try {
  const authRes = await requestAuthCode('auth_base');
  console.log('authCode:', authRes.authCode);
} catch (e) {
  console.error('Auth failed:', e.message);
}

// Location (0=coords only, 1=detailed address)
const location = await requestLocation(1);
console.log(location.latitude, location.longitude, location.city);

// Vibrate feedback
await requestVibrate('medium'); // 'light' | 'medium' | 'heavy'

// Navbar
await setNavbar({ title: '我的页面', backgroundColor: '#ffffff' });

// Toast
await showToast('操作成功', 'success', 2000);

// Loading
await showLoading('请稍候...');
// ... async work ...
await hideLoading();

// Dialog
await alert('提示', '这是一条消息');
const confirmRes = await confirm('确认', '是否删除？');

// System info
const sysInfo = await getSystemInfo();
console.log(sysInfo.platform, sysInfo.screenWidth);

// Storage
await setStorage('user_token', 'abc123');
const stored = await getStorage('user_token');
await removeStorage('user_token');

// Clipboard
await setClipboard('复制的文本');
const clip = await getClipboard();

// Scan QR code
const scanRes = await scan('qr');
console.log(scanRes.code);

// Choose image
const imgRes = await chooseImage(3, ['camera', 'album']);
console.log(imgRes.tempFilePaths);

// Custom message — send any type
const customRes = await sendAsync('my_custom_action', { key: 'value' }, {
  responseType: 'my_custom_action_response',
  timeout: 10000,
});

// Listen for miniprogram push events
on('push', (data) => {
  console.log('Push received:', data.event, data.data);
});
```

### UMD Usage (script tag)

```html
<script src="path/to/alipay-webview-bridge/dist/h5/index.umd.js"></script>
<script>
  var SDK = window.AlipayBridge;
  SDK.init().then(function() {
    SDK.requestAuthCode('auth_base').then(function(res) {
      console.log('authCode:', res.authCode);
    });
    SDK.getSystemInfo().then(function(info) {
      console.log(info.platform);
    });
  });
</script>
```

### Complete API List

| Category | Methods | Notes |
|----------|---------|-------|
| Auth | `requestAuthCode(scopes)` | 'auth_base' or 'auth_user' |
| Location | `requestLocation(type)` | 0=coords, 1=detailed |
| Vibrate | `requestVibrate(type)` | 'light', 'medium', 'heavy' |
| Navbar | `setNavbar(params)`, `setPageTitle(title)` | |
| Toast/Loading | `showToast(content, type, duration)`, `showLoading(content)`, `hideLoading()` | |
| Dialog | `alert(title, content)`, `confirm(title, content)`, `showActionSheet(title, items)` | |
| System | `getSystemInfo()`, `getNetworkType()`, `getBatteryInfo()`, `getServerTime()` | |
| Storage | `setStorage(key, data)`, `getStorage(key)`, `removeStorage(key)` | |
| Clipboard | `setClipboard(text)`, `getClipboard()` | |
| Scan | `scan(type)` | 'qr' default |
| Phone | `makePhoneCall(number)` | |
| Image | `chooseImage(count, sourceType)`, `previewImage(urls)`, `saveImage(url)` | |
| Date | `datePicker(format, currentDate)` | |
| Sensors | `startAccelerometer()`, `stopAccelerometer()`, `onAccelerometerChange(cb)` | Also: Gyroscope, Compass, DeviceMotion |
| Bluetooth | `openBluetoothAdapter()`, `closeBluetoothAdapter()`, `getBluetoothAdapterState()`, `startBluetoothDevicesDiscovery()`, `connectBLEDevice(id)` | Full BLE support |
| WiFi | `startWifi()`, `stopWifi()`, `getConnectedWifi()`, `connectWifi(params)` | |
| BioAuth | `checkBioAuthMode()`, `startBioAuth(type)` | 'fingerPrint' or 'facial' |
| Navigation | `navigateTo(url)`, `navigateBack(delta)`, `navigateToMiniProgram(appId, path)` | |
| Payment | `tradePay(tradeNO)` | |
| HTTP | `httpRequest({ url, method, headers, data })` | Proxied through miniprogram |
| Screen | `getScreenBrightness()`, `setScreenBrightness(v)`, `setKeepScreenOn(bool)` | |
| Contacts | `choosePhoneContact()`, `chooseAlipayContact(count)` | |
| User | `getOpenUserInfo()`, `getPhoneNumber()`, `getAddress()` | |
| WebView | `reloadWebView(url?)` | |
| Custom | `sendAsync(type, params, opts)`, `on(type, handler)`, `once(type, handler)` | For any custom protocol |

All async methods return `Promise<Record<string, unknown>>`. On failure they reject with an Error containing `message`.

## Miniprogram Side

### Basic Setup

```js
// pages/webview/webview.js
const { createBridgeProxy } = require('alipay-webview-bridge/miniprogram');

Page({
  data: { webUrl: 'https://your-h5.com' },
  onLoad() {
    this.proxy = createBridgeProxy(this, {
      extraRegistry: {},           // optional: additional API handlers
      allowDynamicProxy: true,     // optional: auto-proxy unregistered my.xxx calls
      onMessage: (data) => {},     // optional: message listener
    });
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

### Register Custom APIs

```js
// Custom handler — H5 calls via sendAsync('getOrderDetail', { orderId })
this.proxy.registerApi('getOrderDetail', {
  responseType: 'getOrderDetail_response',
  handler: async (data, ctx) => {
    const order = await fetchOrder(data.orderId);
    return { order };
  },
});

// Auto mode — directly proxy to my.xxx with param/result transforms
this.proxy.registerApi('getRunData', {
  responseType: 'getRunData_response',
  handler: 'auto',
  paramsTransform: (data) => ({ countDate: data.date }),
});
```

### Push Data to H5

```js
// Miniprogram can push events to H5 at any time
this.proxy.pushToH5('orderStatusChanged', { orderId: '123', status: 'paid' });
this.proxy.pushToH5('newMessage', { content: '你有一条新消息' });
```

H5 listens:
```ts
import { on } from 'alipay-webview-bridge/h5';

on('push', (data) => {
  if (data.event === 'orderStatusChanged') {
    console.log('Order status:', data.data);
  }
});
```

### BridgeProxy Instance Methods

| Method | Description |
|--------|-------------|
| `handleMessage(e)` | Process incoming WebView message event |
| `sendToH5(message)` | Send arbitrary message to H5 |
| `pushToH5(eventName, payload)` | Push event to H5 (type='push') |
| `registerApi(name, config)` | Register a single custom API |
| `registerApis(apis)` | Register multiple APIs at once |
| `getRegisteredApis()` | List all registered API names |

### ApiConfig Shape

```ts
interface ApiConfig {
  responseType?: string;            // default: apiName + '_response'
  myApi?: string;                   // which my.xxx to call (default: same as api name)
  handler?: 'auto' | Function;     // 'auto' = call my[myApi], or custom async handler
  paramsTransform?: (data) => params;     // transform H5 params before calling my API
  resultTransform?: (res, data) => fields; // transform my API result before replying
}
```

## Code Generation Guidelines

When generating integration code for the user:

1. If the user's scenario is unclear, ask whether they need H5 side, miniprogram side, or both
2. Always include `await init()` before any H5 API calls
3. Default to TypeScript unless the user specifies JavaScript
4. Wrap async calls in try/catch for production code
5. For miniprogram side, always include both the JS Page code and the AXML template
6. When the user needs a custom API, show both sides: the `registerApi` on miniprogram and the `sendAsync` call on H5
