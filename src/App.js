import React, {Component} from 'react';
import './App.css';
const secrets = require('./secrets.json');
//import logo from './logo.svg';
const axios = require('axios');
const stores = require('./stores.json');
let cities = require('cities');

const queryString = require('query-string');

let allStores = stores.allStores;

const randomApiDomain = () => {
  let domains = secrets.domains;
  //let domains = ['a.localhost:3001', 'b.localhost:3001', 'c.localhost:3001'];
  return domains[Math.floor(Math.random()*domains.length)];
}


const saveSearch = (med) => {
  let url = `https://${randomApiDomain()}/meds`;
  //let url = 'http://localhost:3001/meds';
  console.log('save search', med);
  return axios.post(url, med)
  .catch(e => console.log('save search failed'))
}

const insertInList = (arr, elem) => {
  let len = 0;
  if (Array.isArray(arr)) {
    len = arr.length;
  }

  if (len === 0) {
    arr = [];
    arr.push(elem);
    return arr;
  }

  let inserted = false;
  for (let i = 0; i < len; i++) {
    if (elem.price <= arr[i].price) {
      arr.splice(i, 0, elem);
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    arr.splice(len, 0, elem);
  }

  return arr;
};

//===============
class App extends Component {
  constructor() {
    super();
    this.state = {
      upc: '',
      progress: 0,
      statusMessage: '',
      searches: [],
      showInstructions: false
    }

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.searchHistory = this.searchHistory.bind(this);
    this.toggleInstructions = this.toggleInstructions.bind(this);
  }

  searchHistory = async (q) => {
    let url = `https://${randomApiDomain()}/meds`;
    //let url = 'http://localhost:3001/meds';
    let searches = [];
    axios.get(url, {
      params: {
        count: 50,
        q: q
      }
    }).then(response => {
      if (response && response.data) {
        searches = response.data;
      }
      searches = searches.map(s => {
        let store = allStores.filter(store => store.zip === s.zip)[0];
        delete s._id;
        delete s.__v;
        return {...s, storeId: store?store.no:0, address: store?store.address:''};
      });
      this.setState({searches});
    })
    .catch(e => {
      console.log('Cannot get recent searches', e);
    });
  }

  toggleInstructions = () => {
    this.setState({showInstructions: !this.state.showInstructions});
  }

  handleChange(event) {
    let val = (event.target.name === 'inStockOnly') ? event.target.checked: event.target.value;
    this.setState({[event.target.name]: val});
  }

  handleSubmit(event) {
    this.setState({progress: 1, statusMessage: '', product: {}, variants: ''});

    if (this.state.upc.length > 3) {
      let med = {upc: this.state.upc};
      saveSearch(med)
        .finally(() => {
          this.setState({progress: 100});
          console.log('progress', this.state.progress);
          this.searchHistory();
        });
    }
    if (event) {
      event.preventDefault();
    }
  }

  handleSearch(event) {
    this.searchHistory(this.state.q);
    if (event) {
      event.preventDefault();
    }
  }

  componentDidMount() {
    //eslint-disable-next-line
    let upc = queryString.parseUrl(location.href).query.item;
    //eslint-disable-next-line
    let zip = queryString.parseUrl(location.href).query.zip || '';
    //eslint-disable-next-line
    let showAll = queryString.parseUrl(location.href).query.showall;
    this.setState({showAll: (showAll === 'yes')});

    if (upc) {
      this.setState({upc: upc.slice(-12)});
      this.setState({zip: zip});
      setTimeout(() => {
        this.handleSubmit();
      }, 1000 / 60);
    }

    this.searchHistory();
  }
  render() {
    const productDisplay = (this.state.product && this.state.product.sku)? 'block': 'none';

    return ( <div className = "App" >
      <div className = "Entry" >
      <div>
      <div>
      <h2>Scan</h2>
      <button onClick={this.toggleInstructions.bind(this)}>Instructions</button>
      <br/>
      <br/>
      <div style={{textAlign:"left", marginLeft: "40%", display: this.state.showInstructions?"block":"none"}}>
        <ul>
          <li>Instructions go here</li>
        </ul>

      </div>
      </div><br/>
      <form onSubmit={this.handleSubmit}>
        <label>UPC: </label>
        <input type = "text" name="upc" value={this.state.upc} onChange={this.handleChange}/>
        <input disabled={this.state.progress > 0 && this.state.progress < 100} type="submit" value="Submit" />
      </form>

      <div id="progressbar">
      <div id="progress" style={{width:`${this.state.progress}%`}}>{this.state.statusMessage}</div>
      </div>
      <br/>
<br/>

      <div>
      <h3>History</h3>
      <form onSubmit={this.handleSearch}>
        <label>Search: </label>
        <input type = "text" name="q" value={this.state.q||''} onChange={this.handleChange}/>
        <input type="submit" value="Search" /> <br/>
      </form>
      <br/>
      <table className="alternate left-text" align="center" width="95%">
        <tbody>
          <tr><th>UPC</th><th className="right-text">Date</th></tr>
          {
            this.state.searches.map((s, idx) =>
              <tr key={idx}>
                <td width="55%">
                  {s.upc}
                </td>
                <td width="45%" className="right-text">{s.createdDate}</td>
              </tr>
            )
          }
        </tbody>
      </table>
      <br/>
      </div>
      </div>
      </div>
      </div>
    );
  }
}

export default App;
