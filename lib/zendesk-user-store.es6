import _ from 'underscore';
import request from 'request';
import NylasStore from 'nylas-store';
import {FocusedContactsStore} from 'nylas-exports';


// This package uses the Flux pattern - our Store is a small singleton that
// observes other parts of the application and vends data to our React
// component. If the user could interact with the ZendeskSidebar, this store
// would also listen for `Actions` emitted by our React components.
class ZendeskUserStore extends NylasStore {
  constructor() {
    super();

    this._profile = null;
    this._cache = {};
    this._loading = false;
    this._error = null;

    // Register a callback with the FocusedContactsStore. This will tell us
    // whenever the selected person has changed so we can refresh our data.
    this.listenTo(FocusedContactsStore, this._onFocusedContactChanged);
  }

  // Getter Methods

  profileForFocusedContact() {
    return this._profile;
  }

  loading() {
    return this._loading;
  }

  error() {
    return this._error;
  }

  // Called when the FocusedContactStore `triggers`, notifying us that the data
  // it vends has changed.
  _onFocusedContactChanged = () => {
    // Grab the new focused contact
    const contact = FocusedContactsStore.focusedContact();

    // First, clear the contact that we're currently showing and `trigger`. Since
    // our React component observes our store, `trigger` causes our React component
    // to re-render.
    this._error = null;
    this._profile = null;

    if (contact) {
      this._profile = this._cache[contact.email];
      if (this._profile === undefined) {
        // Make a Zendesk search request to find the matching user profile
        this._zendeskFetchProfile(contact.email);
      }
    }

    this.trigger(this);
  }

  _zendeskFetchProfile(zd_subdomain, email) {
    this._loading = true
    this._zendeskRequest(`https://${zd_subdomain}.zendesk.com/api/v2/users/search.json?query=${email}`, (err, resp, data) => {
      if (err || !data) {
        return;
      }

      if (data.message !== undefined) {
        console.warn(data.message);
      }

      // Sometimes we get rate limit errors, etc., so we need to check and make
      // sure we've gotten items before pulling the first one.
      let profile = false;
      if (data && data.users && data.users[0]) {
        profile = data.users[0];
        //profile_photo = data.users[0].photo.content_url; need this later
      }

      // If a profile was found, make a second request for the user's tickets
      if (profile !== false) {
        profile.tickets = [];
        this._zendeskRequest(`https://${zd_subdomain}.zendesk.com/api/v2/users/${profile.id}/tickets/requested.json`, (queryErr, queryResp, query) => {
          // Sort the zendesk by their ticket id
          profile.tickets = _.sortBy(query.tickets, (tickets) => -tickets.id);
          // Trigger so that our React components refresh their state and display
          // the updated data.
          this.trigger(this);
        });
      }

      this._loading = false;
      this._profile = this._cache[email] = profile;
      this.trigger(this);
    });
  }

  // Wrap the Node `request` library and pass the User-Agent header, which is required
  // by Zendesk's API. Also pass `json:true`, which causes responses to be automatically
  // parsed.
  _zendeskRequest(url, callback) {
    return request({url: url, headers: {'User-Agent': 'request'}, auth: {'user': `${zd_email}/token` , 'pass': `${zd_api_token}` }, json: true}, callback);
  }
}

export default new ZendeskUserStore();
