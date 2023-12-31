// Copyright 2018 The Outline Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as errors from '../../model/errors';
import * as events from '../../model/events';
import {Server, ServerType} from '../../model/server';
import {Settings, SettingsKey} from '../settings';

import {Tunnel, TunnelStatus, ShadowsocksSessionConfig} from '../tunnel';

import {fetchShadowsocksSessionConfig, staticKeyToShadowsocksSessionConfig} from './access_key_serialization';

// PLEASE DON'T use this class outside of this `outline_server_repository` folder!

export class OutlineServer implements Server {
  // We restrict to AEAD ciphers because unsafe ciphers are not supported in go-tun2socks.
  // https://shadowsocks.org/en/spec/AEAD-Ciphers.html
  private static readonly SUPPORTED_CIPHERS = ['chacha20-ietf-poly1305', 'aes-128-gcm', 'aes-192-gcm', 'aes-256-gcm'];

  errorMessageId?: string;
  private sessionConfig?: ShadowsocksSessionConfig;

  constructor(
    public readonly id: string,
    public readonly accessKey: string,
    public readonly type: ServerType,
    private _name: string,
    private tunnel: Tunnel,
    private eventQueue: events.EventQueue
  ) {
    switch (this.type) {
      case ServerType.DYNAMIC_CONNECTION:
        this.accessKey = accessKey.replace(/^ssconf:\/\//, 'https://');
        break;
      case ServerType.STATIC_CONNECTION:
      default:
        this.sessionConfig = staticKeyToShadowsocksSessionConfig(accessKey);
        break;
    }

    this.tunnel.onStatusChange((status: TunnelStatus) => {
      let statusEvent: events.OutlineEvent;
      switch (status) {
        case TunnelStatus.CONNECTED:
          statusEvent = new events.ServerConnected(this);
          break;
        case TunnelStatus.DISCONNECTED:
          statusEvent = new events.ServerDisconnected(this);
          break;
        case TunnelStatus.RECONNECTING:
          statusEvent = new events.ServerReconnecting(this);
          break;
        default:
          console.warn(`Received unknown tunnel status ${status}`);
          return;
      }
      eventQueue.enqueue(statusEvent);
    });
  }

  get name() {
    return this._name;
  }

  set name(newName: string) {
    this._name = newName;
  }

  get address() {
    if (!this.sessionConfig) return '';

    return `${this.sessionConfig.host}:${this.sessionConfig.port}`;
  }

  get sessionConfigLocation() {
    if (this.type !== ServerType.DYNAMIC_CONNECTION) {
      return;
    }
    const settings = new Settings();
    let country = settings.get(SettingsKey.VPN_COUNTRY);
    if (country === undefined) {
      country = 'en';
    }
    const url = new URL(this.accessKey);
    url.searchParams.set('lang', country);
    return url;
  }

  get isOutlineServer() {
    return this.accessKey.includes('outline=1');
  }

  async fetchCountries() {
    const settings = new Settings();

    const servers = await fetch(this.sessionConfigLocation, {method: 'post'});
    console.log('Recived servers', servers);

    await settings.set(SettingsKey.VPN_SERVERS, await servers.json());
  }

  async connect() {
    if (this.type === ServerType.DYNAMIC_CONNECTION) {
      this.sessionConfig = await fetchShadowsocksSessionConfig(this.sessionConfigLocation);
    }

    await this.fetchCountries();

    try {
      await this.tunnel.start(this.sessionConfig);
    } catch (cause) {
      // e originates in "native" code: either Cordova or Electron's main process.
      // Because of this, we cannot assume "instanceof OutlinePluginError" will work.
      if (cause.errorCode) {
        throw errors.fromErrorCode(cause.errorCode);
      }

      throw new errors.ProxyConnectionFailure(`Failed to connect to server ${this.name}.`, {cause});
    }
  }

  async disconnect() {
    try {
      await this.tunnel.stop();

      if (this.type === ServerType.DYNAMIC_CONNECTION) {
        this.sessionConfig = undefined;
      }
    } catch (e) {
      // All the plugins treat disconnection errors as ErrorCode.UNEXPECTED.
      throw new errors.RegularNativeError();
    }
  }

  checkRunning(): Promise<boolean> {
    return this.tunnel.isRunning();
  }

  static isServerCipherSupported(cipher?: string) {
    return cipher !== undefined && OutlineServer.SUPPORTED_CIPHERS.includes(cipher);
  }
}
