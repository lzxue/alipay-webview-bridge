declare const my: {
  createWebViewContext: (id: string) => WebViewContext;
  [key: string]: unknown;
};

interface WebViewContext {
  postMessage: (message: Record<string, unknown>) => void;
}

export type ApiHandler = (data: Record<string, unknown>, ctx: PageContext) => Promise<Record<string, unknown>>;

export interface ApiConfig {
  responseType?: string;
  myApi?: string;
  handler?: 'auto' | ApiHandler;
  paramsTransform?: (data: Record<string, unknown>) => Record<string, unknown>;
  resultTransform?: (res: Record<string, unknown>, data: Record<string, unknown>) => Record<string, unknown>;
}

export interface BridgeProxyOptions {
  extraRegistry?: Record<string, ApiConfig>;
  allowDynamicProxy?: boolean;
  onMessage?: (data: Record<string, unknown>) => void;
}

export interface BridgeProxy {
  handleMessage: (e: { detail?: Record<string, unknown> }) => void;
  sendToH5: (message: Record<string, unknown>) => void;
  pushToH5: (eventName: string, payload: unknown) => void;
  registerApi: (name: string, config: ApiConfig) => void;
  registerApis: (apis: Record<string, ApiConfig>) => void;
  getRegisteredApis: () => string[];
}

interface PageContext {
  data: Record<string, unknown>;
  setData: (obj: Record<string, unknown>) => void;
  __bridgeProxy?: BridgeProxy;
  [key: string]: unknown;
}

export const DEFAULT_REGISTRY: Record<string, ApiConfig> = {

  request_authcode: {
    responseType: 'authcode_response',
    myApi: 'getAuthCode',
    handler: 'auto',
    paramsTransform: (data) => ({ scopes: (data.scopes as string) || 'auth_base' }),
    resultTransform: (res) => ({ authCode: res.authCode }),
  },

  request_location: {
    responseType: 'location_response',
    myApi: 'getLocation',
    handler: 'auto',
    paramsTransform: (data) => ({ type: data.locationType || 0 }),
    resultTransform: (res) => ({
      latitude: res.latitude,
      longitude: res.longitude,
      accuracy: res.accuracy,
      horizontalAccuracy: res.horizontalAccuracy,
      city: res.city || '',
      cityCode: res.cityCode || '',
      district: res.district || '',
      province: res.province || '',
      street: res.street || '',
      streetNumber: res.streetNumber || '',
    }),
  },

  request_vibrate: {
    responseType: 'vibrate_response',
    myApi: 'vibrate',
    handler: 'auto',
    paramsTransform: (data) => ({ type: data.vibrateType || 'light' }),
    resultTransform: (_res, data) => ({ vibrateType: data.vibrateType || 'light', message: '震动执行成功' }),
  },

  set_navbar: {
    responseType: 'navbar_response',
    myApi: 'setNavigationBar',
    handler: 'auto',
    paramsTransform: (data) => {
      const config: Record<string, unknown> = {};
      if (data.title !== undefined) config.title = data.title;
      if (data.backgroundColor) config.backgroundColor = data.backgroundColor;
      if (data.borderBottomColor) config.borderBottomColor = data.borderBottomColor;
      if (data.image) config.image = data.image;
      return config;
    },
    resultTransform: (_res, data) => ({ message: '导航栏设置成功', title: data.title || '' }),
  },

  page_title: {
    responseType: 'title_response',
    handler: (data) => {
      return new Promise((resolve) => {
        (my as Record<string, Function>).setNavigationBar({ title: data.content || '' });
        resolve({ message: '标题设置成功', title: data.content as string });
      });
    },
  },

  reload_webview: {
    responseType: 'reload_response',
    handler: (data, ctx) => {
      return new Promise((resolve) => {
        const targetUrl = (data.url || ctx.data.webUrl || ctx.data.webViewUrl || '') as string;
        const baseUrl = targetUrl.replace(/[?&]t=\d+/, '').replace(/[?&]$/, '');
        const separator = baseUrl.indexOf('?') > -1 ? '&' : '?';
        const webUrl = baseUrl + separator + 't=' + Date.now();
        const setObj: Record<string, unknown> = {};
        if (ctx.data.webUrl !== undefined) setObj.webUrl = webUrl;
        if (ctx.data.webViewUrl !== undefined) setObj.webViewUrl = webUrl;
        if (!setObj.webUrl && !setObj.webViewUrl) setObj.webUrl = webUrl;
        ctx.setData(setObj);
        resolve({ message: 'WebView 已重新加载', url: webUrl });
      });
    },
  },

  getSystemInfo: { responseType: 'getSystemInfo_response', handler: 'auto' },
  getNetworkType: { responseType: 'getNetworkType_response', handler: 'auto' },

  scan: {
    responseType: 'scan_response',
    handler: 'auto',
    paramsTransform: (data) => ({ type: data.scanType || 'qr' }),
  },

  showToast: {
    responseType: 'showToast_response',
    handler: 'auto',
    paramsTransform: (data) => ({
      content: data.content || data.title || '',
      type: data.toastType || 'none',
      duration: data.duration || 2000,
    }),
  },

  alert: {
    responseType: 'alert_response',
    handler: 'auto',
    paramsTransform: (data) => ({
      title: data.title || '',
      content: data.content || '',
      buttonText: data.buttonText || '确定',
    }),
  },

  confirm: {
    responseType: 'confirm_response',
    handler: 'auto',
    paramsTransform: (data) => ({
      title: data.title || '',
      content: data.content || '',
      confirmButtonText: data.confirmButtonText || '确定',
      cancelButtonText: data.cancelButtonText || '取消',
    }),
  },

  showLoading: {
    responseType: 'showLoading_response',
    handler: 'auto',
    paramsTransform: (data) => ({ content: data.content || '加载中...', delay: data.delay || 0 }),
  },

  hideLoading: { responseType: 'hideLoading_response', handler: 'auto' },

  getStorage: {
    responseType: 'getStorage_response',
    handler: 'auto',
    paramsTransform: (data) => ({ key: data.key || '' }),
  },

  setStorage: {
    responseType: 'setStorage_response',
    handler: 'auto',
    paramsTransform: (data) => ({ key: data.key || '', data: data.data }),
  },

  removeStorage: {
    responseType: 'removeStorage_response',
    handler: 'auto',
    paramsTransform: (data) => ({ key: data.key || '' }),
  },

  getClipboard: { responseType: 'getClipboard_response', handler: 'auto' },

  setClipboard: {
    responseType: 'setClipboard_response',
    handler: 'auto',
    paramsTransform: (data) => ({ text: data.text || '' }),
  },

  chooseImage: {
    responseType: 'chooseImage_response',
    handler: 'auto',
    paramsTransform: (data) => ({ count: data.count || 1, sourceType: data.sourceType || ['camera', 'album'] }),
  },

  previewImage: {
    responseType: 'previewImage_response',
    handler: 'auto',
    paramsTransform: (data) => ({ urls: data.urls || [], current: data.current || 0 }),
  },

  saveImage: {
    responseType: 'saveImage_response',
    handler: 'auto',
    paramsTransform: (data) => ({ url: data.url || '' }),
  },

  openLocation: {
    responseType: 'openLocation_response',
    handler: 'auto',
    paramsTransform: (data) => ({
      longitude: data.longitude || '',
      latitude: data.latitude || '',
      name: data.name || '',
      address: data.address || '',
      scale: data.scale || 15,
    }),
  },

  chooseLocation: { responseType: 'chooseLocation_response', handler: 'auto' },

  makePhoneCall: {
    responseType: 'makePhoneCall_response',
    handler: 'auto',
    paramsTransform: (data) => ({ number: data.number || '' }),
  },

  getScreenBrightness: { responseType: 'getScreenBrightness_response', handler: 'auto' },
  setScreenBrightness: {
    responseType: 'setScreenBrightness_response',
    handler: 'auto',
    paramsTransform: (data) => ({ brightness: data.brightness || 1 }),
  },
  setKeepScreenOn: {
    responseType: 'setKeepScreenOn_response',
    handler: 'auto',
    paramsTransform: (data) => ({ keepScreenOn: data.keepScreenOn !== false }),
  },

  choosePhoneContact: { responseType: 'choosePhoneContact_response', handler: 'auto' },
  chooseAlipayContact: {
    responseType: 'chooseAlipayContact_response',
    handler: 'auto',
    paramsTransform: (data) => ({ count: data.count || 1 }),
  },

  datePicker: {
    responseType: 'datePicker_response',
    handler: 'auto',
    paramsTransform: (data) => ({ format: data.format || 'yyyy-MM-dd', currentDate: data.currentDate || '' }),
  },

  showActionSheet: {
    responseType: 'showActionSheet_response',
    handler: 'auto',
    paramsTransform: (data) => ({ title: data.title || '', items: data.items || [], cancelButtonText: data.cancelButtonText || '取消' }),
  },

  openBluetoothAdapter: { responseType: 'openBluetoothAdapter_response', handler: 'auto' },
  closeBluetoothAdapter: { responseType: 'closeBluetoothAdapter_response', handler: 'auto' },
  getBluetoothAdapterState: { responseType: 'getBluetoothAdapterState_response', handler: 'auto' },
  startBluetoothDevicesDiscovery: {
    responseType: 'startBluetoothDevicesDiscovery_response',
    handler: 'auto',
    paramsTransform: (data) => ({ services: data.services || [] }),
  },
  stopBluetoothDevicesDiscovery: { responseType: 'stopBluetoothDevicesDiscovery_response', handler: 'auto' },
  getBluetoothDevices: { responseType: 'getBluetoothDevices_response', handler: 'auto' },
  getConnectedBluetoothDevices: {
    responseType: 'getConnectedBluetoothDevices_response',
    handler: 'auto',
    paramsTransform: (data) => ({ services: data.services || [] }),
  },
  connectBLEDevice: {
    responseType: 'connectBLEDevice_response',
    handler: 'auto',
    paramsTransform: (data) => ({ deviceId: data.deviceId || '' }),
  },
  disconnectBLEDevice: {
    responseType: 'disconnectBLEDevice_response',
    handler: 'auto',
    paramsTransform: (data) => ({ deviceId: data.deviceId || '' }),
  },
  getBLEDeviceServices: {
    responseType: 'getBLEDeviceServices_response',
    handler: 'auto',
    paramsTransform: (data) => ({ deviceId: data.deviceId || '' }),
  },
  getBLEDeviceCharacteristics: {
    responseType: 'getBLEDeviceCharacteristics_response',
    handler: 'auto',
    paramsTransform: (data) => ({ deviceId: data.deviceId || '', serviceId: data.serviceId || '' }),
  },

  navigateTo: {
    responseType: 'navigateTo_response',
    handler: 'auto',
    paramsTransform: (data) => ({ url: data.url || '' }),
  },
  navigateBack: {
    responseType: 'navigateBack_response',
    handler: 'auto',
    paramsTransform: (data) => ({ delta: data.delta || 1 }),
  },
  navigateToMiniProgram: {
    responseType: 'navigateToMiniProgram_response',
    handler: 'auto',
    paramsTransform: (data) => ({ appId: data.appId || '', path: data.path || '', extraData: data.extraData || {} }),
  },

  tradePay: {
    responseType: 'tradePay_response',
    handler: 'auto',
    paramsTransform: (data) => ({ tradeNO: data.tradeNO || data.orderStr || '' }),
  },

  getServerTime: { responseType: 'getServerTime_response', handler: 'auto' },

  httpRequest: {
    responseType: 'httpRequest_response',
    myApi: 'request',
    handler: 'auto',
    paramsTransform: (data) => ({
      url: data.url || '',
      method: data.method || 'GET',
      headers: data.headers || {},
      data: data.data || data.body || '',
      dataType: data.dataType || 'json',
      timeout: data.timeout || 30000,
    }),
  },

  startPullDownRefresh: { responseType: 'startPullDownRefresh_response', handler: 'auto' },
  stopPullDownRefresh: { responseType: 'stopPullDownRefresh_response', handler: 'auto' },
  getAddress: { responseType: 'getAddress_response', handler: 'auto' },
  getOpenUserInfo: { responseType: 'getOpenUserInfo_response', handler: 'auto' },
  getPhoneNumber: { responseType: 'getPhoneNumber_response', handler: 'auto' },

  startBioAuth: {
    responseType: 'startBioAuth_response',
    handler: 'auto',
    paramsTransform: (data) => ({ type: data.type || 'fingerPrint' }),
  },
  checkBioAuthMode: { responseType: 'checkBioAuthMode_response', handler: 'auto' },
  getBatteryInfo: { responseType: 'getBatteryInfo_response', handler: 'auto' },

  addPhoneCalendar: {
    responseType: 'addPhoneCalendar_response',
    handler: 'auto',
    paramsTransform: (data) => ({
      title: data.title || '',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      location: data.location || '',
      notes: data.notes || '',
      alarm: data.alarm !== undefined ? data.alarm : true,
    }),
  },

  getRunData: {
    responseType: 'getRunData_response',
    handler: 'auto',
    paramsTransform: (data) => ({ countDate: data.countDate || '' }),
  },

  startWifi: { responseType: 'startWifi_response', handler: 'auto' },
  stopWifi: { responseType: 'stopWifi_response', handler: 'auto' },
  getConnectedWifi: { responseType: 'getConnectedWifi_response', handler: 'auto' },
  connectWifi: {
    responseType: 'connectWifi_response',
    handler: 'auto',
    paramsTransform: (data) => ({ SSID: data.SSID || '', BSSID: data.BSSID || '', password: data.password || '' }),
  },

  // ========== Sensors (push mode) ==========

  startAccelerometer: {
    responseType: 'startAccelerometer_response',
    handler: (data, ctx) => {
      return new Promise((resolve) => {
        const interval = data.interval || 'normal';
        if (typeof my.onAccelerometerChange === 'function') {
          (my.onAccelerometerChange as Function)((res: unknown) => {
            if (ctx.__bridgeProxy && ctx.__bridgeProxy.pushToH5) {
              ctx.__bridgeProxy.pushToH5('accelerometerChange', res);
            }
          });
        }
        resolve({ message: '加速度计已启动', interval: interval as string });
      });
    },
  },

  stopAccelerometer: {
    responseType: 'stopAccelerometer_response',
    handler: (_data, _ctx) => {
      return new Promise((resolve) => {
        if (typeof my.offAccelerometerChange === 'function') (my.offAccelerometerChange as Function)();
        resolve({ message: '加速度计已停止' });
      });
    },
  },

  startGyroscope: {
    responseType: 'startGyroscope_response',
    handler: (data, ctx) => {
      return new Promise((resolve) => {
        const interval = data.interval || 'normal';
        if (typeof my.onGyroscopeChange === 'function') {
          (my.onGyroscopeChange as Function)((res: unknown) => {
            if (ctx.__bridgeProxy && ctx.__bridgeProxy.pushToH5) {
              ctx.__bridgeProxy.pushToH5('gyroscopeChange', res);
            }
          });
        }
        resolve({ message: '陀螺仪已启动', interval: interval as string });
      });
    },
  },

  stopGyroscope: {
    responseType: 'stopGyroscope_response',
    handler: (_data, _ctx) => {
      return new Promise((resolve) => {
        if (typeof my.offGyroscopeChange === 'function') (my.offGyroscopeChange as Function)();
        resolve({ message: '陀螺仪已停止' });
      });
    },
  },

  startCompass: {
    responseType: 'startCompass_response',
    handler: (_data, ctx) => {
      return new Promise((resolve) => {
        if (typeof my.onCompassChange === 'function') {
          (my.onCompassChange as Function)((res: unknown) => {
            if (ctx.__bridgeProxy && ctx.__bridgeProxy.pushToH5) {
              ctx.__bridgeProxy.pushToH5('compassChange', res);
            }
          });
        }
        resolve({ message: '罗盘已启动' });
      });
    },
  },

  stopCompass: {
    responseType: 'stopCompass_response',
    handler: (_data, _ctx) => {
      return new Promise((resolve) => {
        if (typeof my.offCompassChange === 'function') (my.offCompassChange as Function)();
        resolve({ message: '罗盘已停止' });
      });
    },
  },

  startDeviceMotionListening: {
    responseType: 'startDeviceMotionListening_response',
    handler: (_data, ctx) => {
      return new Promise((resolve) => {
        if (typeof my.onDeviceMotionChange === 'function') {
          (my.onDeviceMotionChange as Function)((res: unknown) => {
            if (ctx.__bridgeProxy && ctx.__bridgeProxy.pushToH5) {
              ctx.__bridgeProxy.pushToH5('deviceMotionChange', res);
            }
          });
        }
        resolve({ message: '设备运动监听已启动' });
      });
    },
  },

  stopDeviceMotionListening: {
    responseType: 'stopDeviceMotionListening_response',
    handler: (_data, _ctx) => {
      return new Promise((resolve) => {
        if (typeof my.offDeviceMotionChange === 'function') (my.offDeviceMotionChange as Function)();
        resolve({ message: '设备运动监听已停止' });
      });
    },
  },
};

export function createBridgeProxy(pageContext: PageContext, options?: BridgeProxyOptions): BridgeProxy {
  const opts = options || {};
  const extraRegistry = opts.extraRegistry || {};
  const allowDynamicProxy = opts.allowDynamicProxy !== false;
  const onMessage = opts.onMessage || null;

  const registry: Record<string, ApiConfig> = {};
  for (const key in DEFAULT_REGISTRY) registry[key] = DEFAULT_REGISTRY[key];
  for (const key in extraRegistry) registry[key] = extraRegistry[key];

  let webViewContext: WebViewContext | null = null;

  function getWebViewContext(): WebViewContext | null {
    try {
      webViewContext = my.createWebViewContext('web-view');
    } catch (e) {
      console.error('[SDK] Failed to create WebView context:', e);
    }
    return webViewContext;
  }

  function sendToH5(message: Record<string, unknown>): void {
    const ctx = getWebViewContext();
    if (ctx) {
      ctx.postMessage(message);
      console.log('[SDK] → H5:', JSON.stringify(message));
    } else {
      console.error('[SDK] WebView context unavailable');
    }
  }

  function replySuccess(responseType: string, extraFields?: Record<string, unknown>): void {
    const msg: Record<string, unknown> = { type: responseType, status: 'success', timestamp: Date.now() };
    if (extraFields) {
      for (const k in extraFields) msg[k] = extraFields[k];
    }
    sendToH5(msg);
  }

  function replyFail(responseType: string, errorMessage: string, errorCode?: string): void {
    sendToH5({
      type: responseType,
      status: 'fail',
      errorMessage,
      errorCode: errorCode || '',
      timestamp: Date.now(),
    });
  }

  function invokeMyApi(
    myApiName: string,
    params: Record<string, unknown>,
    responseType: string,
    resultTransform?: ApiConfig['resultTransform'],
    originalData?: Record<string, unknown>,
  ): void {
    if (typeof my[myApiName] !== 'function') {
      replyFail(responseType, 'my.' + myApiName + ' does not exist');
      return;
    }

    (my[myApiName] as Function)({
      ...params,
      success: (res: Record<string, unknown>) => {
        console.log('[SDK] my.' + myApiName + ' success:', JSON.stringify(res));
        const fields = resultTransform ? resultTransform(res, originalData || {}) : res;
        replySuccess(responseType, fields);
      },
      fail: (err: Record<string, unknown>) => {
        console.error('[SDK] my.' + myApiName + ' fail:', JSON.stringify(err));
        replyFail(responseType, (err.errorMessage || err.message || myApiName + ' failed') as string, (err.error || err.errorCode || '') as string);
      },
    });
  }

  function handleMessage(e: { detail?: Record<string, unknown> }): void {
    const data = (e.detail && typeof e.detail === 'object') ? e.detail : {};
    const apiName = (data.type || '') as string;

    console.log('[SDK] ← H5: ' + apiName, JSON.stringify(data));
    if (onMessage) onMessage(data);
    if (!apiName) return;

    const config = registry[apiName];

    if (config) {
      const responseType = config.responseType || (apiName + '_response');
      const myApi = config.myApi || apiName;
      const handler = config.handler;
      const paramsTransform = config.paramsTransform;
      const resultTransform = config.resultTransform;

      if (typeof handler === 'function') {
        Promise.resolve(handler(data, pageContext))
          .then((result) => { replySuccess(responseType, result); })
          .catch((err: Error) => { replyFail(responseType, err.message || apiName + ' failed'); });
        return;
      }

      const apiParams = paramsTransform ? paramsTransform(data) : {};
      invokeMyApi(myApi, apiParams, responseType, resultTransform, data);
      return;
    }

    if (allowDynamicProxy && typeof my[apiName] === 'function') {
      console.log('[SDK] Dynamic proxy: my.' + apiName);
      invokeMyApi(apiName, data, apiName + '_response', undefined, data);
      return;
    }

    console.warn('[SDK] Unregistered: ' + apiName);
    replyFail(apiName + '_response', 'Unsupported API: ' + apiName);
  }

  function pushToH5(eventName: string, payload: unknown): void {
    sendToH5({ type: 'push', event: eventName, data: payload, timestamp: Date.now() });
  }

  function registerApi(name: string, config: ApiConfig): void { registry[name] = config; }
  function registerApis(apis: Record<string, ApiConfig>): void { for (const k in apis) registry[k] = apis[k]; }
  function getRegisteredApis(): string[] { return Object.keys(registry); }

  const proxyInstance: BridgeProxy = {
    handleMessage,
    sendToH5,
    pushToH5,
    registerApi,
    registerApis,
    getRegisteredApis,
  };

  pageContext.__bridgeProxy = proxyInstance;

  return proxyInstance;
}
