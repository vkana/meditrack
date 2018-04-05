import React, {Component} from 'react';
import './App.css';
//import logo from './logo.svg';
const axios = require('axios');
const stores = require('./stores.json');
//===============
const secrets = require('./secrets.json');
const apiKey = secrets.apiKey;
const walmart = require('walmart')(apiKey);

let allStores = stores.allStores.slice(0,40);
let failedStores = [];

const getUPC = async (sku) => {
  const apiKey = secrets.apiKey;
  const url = `https://cors-anywhere.herokuapp.com/http://api.walmartlabs.com/v1/items/${sku}?apiKey=${apiKey}`;
  let resp = await axios.get(url);
  return resp.data.upc;
};

const getPrice = (response => {
  let priceObj = {
    "no": 0,
    "price": 9999,
    "stock": "NA"
  };
  if (response && response.data && response.data.data && response.data.data.inStore) {
    priceObj = {
      "no": response.data.data.inStore.storeId,
      "price": response.data.data.inStore.price.priceInCents / 100,
      "stock": response.data.data.inStore.inventory ? response.data.data.inStore.inventory.status : 'NA'
    };
    //priceObj.stock = response.data.data.inStore.inventory ? response.data.data.inStore.inventory.status : 'NA';
  }
  return priceObj;
});

const productDetails = (result) => {
  return {
    name: result.data.data.common.name,
    sku: result.data.data.common.productId.wwwItemId,
    upc: result.data.data.common.productId.upca,
    url: result.data.data.common.productUrl,
    bsUrl: 'https://www.brickseek.com/walmart-inventory-checker?sku=' + result.data.data.common.productId.wwwItemId,
    available: result.data.data.common.offerType
  };
}

const getStore = storeId => {return allStores.filter(st => st.no === storeId)[0]};

const getStorePricePromise = (upc, storeId) => {
  let url = `https://search.mobile.walmart.com/v1/products-by-code/UPC/${upc}`;
  return axios.get(url, {
    params: {
      storeId: storeId
    }
  }).catch(e => {
    failedStores.push(storeId);
    return e;
  })
};


//===============
class App extends Component {
  constructor() {
    super();
    this.state = {
      upc: '',
      zip: '',
      storePrices: [],
      product: {name: '', sku: '', upc: ''},
      progress: 0
    }

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.searchStores = this.searchStores.bind(this);
  }

  searchStores = async (upc, zip) => {
    let lowPrice = 9999;

    if (zip && zip.length === 5) {
      allStores = await walmart.stores.byZip(zip);
    };

    let concurrent = 500;
    let product = null;

    if (upc.length < 12) {
      upc = await getUPC(upc);
    }
    const storeCount = allStores.length;
    let promiseArray = [];

    for (let i = 0; i < storeCount; i++) {
      let storeId = allStores[i].no;
      promiseArray.push(getStorePricePromise(upc, storeId));

      if ((i % concurrent === 0 || i === storeCount - 1)) {
        this.setState({progress: (i * 100/ storeCount)});
        try {
          let results = await Promise.all(promiseArray);
          if (!product) {
            product = productDetails(results[0]);
            this.setState({product: product});
          };
          results.map(r => {
            let priceObj = getPrice(r);
            if (priceObj.no !== 0 && (priceObj.price <= lowPrice || allStores.length < 100)) {
              let store = getStore(priceObj.no);
              priceObj.zip = '00000'.concat(store.zip).substr(-5);
              priceObj.address = store.address || store.streetAddress;
              zip = priceObj.zip;
              let storePrices = this.state.storePrices;
              storePrices.unshift(priceObj);
              this.setState({storePrices: storePrices});
              lowPrice = priceObj.price;
            }
          });
          promiseArray = [];

        } catch (e) {
          console.log('errored', e.code || (e.response ? e.response.status : '') || e);
        }
      }
    }
    //this.setState({progress: 'Done. Skipped ' + failedStores.length + ' stores'});
    this.setState({progress: 100});
  }

  handleChange(event) {
    this.setState({[event.target.name]: event.target.value});
  }

  handleSubmit(event) {
    if (this.state.upc.length > 5) {
      this.setState({storePrices: []});
      this.searchStores(this.state.upc, this.state.zip);
    }
    event.preventDefault();
  }

  componentWillMount() {
    /*if (this.state.upc.length > 5) {
      this.searchStores(this.state.upc, null);
    }*/

  }
  render() {
    return ( <div className = "App" >
      <div className = "Entry" >
      <div>
      <div>
      <h3>Walmart nationwide price search </h3>
      Enter SKU or UPC. Search may take 3-5 minutes.
      </div><br/>
      <form onSubmit={this.handleSubmit}>
        <label>
        SKU or UPC: <input type = "text" name="upc" value={this.state.upc} onChange={this.handleChange}/>
        </label>
        <label style={{display:"none"}}>
        ZIP: <input type = "text" name="zip" value={this.state.zip} onChange={this.handleChange}/>
        </label>
        <input type="submit" value="Submit" />
      </form>

      <div id="progressbar">
      <div id="progress" style={{width:`${this.state.progress}%`}}>{this.state.progress === 100 ? 'Done!': ''}</div>
      </div>
      <br/>


          <div>
          <div>Walmart: <a target="_blank" href={this.state.product.url}>{this.state.product.name}</a></div>
          <div>Brickseek: <a target="_blank" href={this.state.product.bsUrl}>{this.state.product.sku}</a></div>
          <div>UPC: {this.state.product.upc}</div>
          </div>

<br/>
      <table align="center">

      <tbody>
      <tr>
      <th>Store #</th><th>Address</th><th>ZIP</th><th>Price</th><th>Stock</th>
      </tr>

      {
        this.state.storePrices.map(storePrice =>

          <tr key={storePrice.no}>
            <td>{storePrice.no}</td>
            <td>{storePrice.address}</td>
            <td>{storePrice.zip}</td>
            <td>{storePrice.price}</td>
            <td>{storePrice.stock}</td>
          </tr>
        )
      }
      </tbody>
      </table>

      </div>

      </div>
      </div>
    );
  }
}

export default App;