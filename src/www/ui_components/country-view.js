/*
  Copyright 2020 The Outline Authors

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import {DirMixin} from '@polymer/polymer/lib/mixins/dir-mixin.js';
import {html} from '@polymer/polymer/lib/utils/html-tag.js';
import {PolymerElement} from '@polymer/polymer/polymer-element.js';
import {Settings, SettingsKey} from '../app/settings';
class OutlineCountryView extends DirMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        :host {
          background: #fff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
          width: 100%;
          height: 100vh;
          font-family: var(--outline-font-family);
        }
        .country-item {
          display: flex;
          cursor: pointer;
          font-size: 16px;
          border-bottom: 1px solid #e0e0e0;
          padding-left: 24px;
          --paper-item-selected: {
            color: var(--medium-green);
            font-weight: normal;
          }
        }
        .country-speed {
          margin-left: 10px;
          opacity: 0.8;
          float: right;
        }
        .country-name {
          text-align: left;
          flex-grow: 1;
        }

        .country-flag {
          font-size: larger;
          margin-right: 10px;
        }
      </style>

      <div id="main">
        <paper-listbox selected="{{selectedCoutry}}" attr-for-selected="value" on-selected-changed="_countrySelected">
          <template is="dom-repeat" items="[[countries]]" as="country" mutable-data restamp="true">
            <paper-item class="country-item" value="{{country.name}}">
              <span class="country-flag">{{country.flag}}</span>
              <span class="country-name"> {{country.title}}<small class="country-speed">{{country.speed}}</small></span>

              <iron-icon icon="check" hidden$="{{_shouldHideCheckmark(selectedCountry, country.name)}}"></iron-icon>
            </paper-item>
          </template>
        </paper-listbox>
      </div>
    `;
  }

  static get is() {
    return 'country-view';
  }

  static get properties() {
    return {
      selectedCountry: String,
      // An array of {id, name, dir} country objects.
      countries: {
        type: Array,
        value() {
          const settings = new Settings();
          const servers = settings.get(SettingsKey.VPN_SERVERS);
          console.log(servers);
          return servers;
        },
      },
    };
  }

  _countrySelected(event) {
    const params = {bubbles: true, composed: true, detail: {country: event.detail.value}};
    this.selectedCountry = event.detail.value;
    this.dispatchEvent(new CustomEvent('SetCountryRequested', params));
  }

  _shouldHideCheckmark(selectedCountry, countryCode) {
    return selectedCountry !== countryCode;
  }
}
customElements.define(OutlineCountryView.is, OutlineCountryView);
