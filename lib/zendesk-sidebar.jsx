import _ from 'underscore';
import ZendeskUserStore from "./zendesk-user-store";
import {React} from 'nylas-exports';

// Small React component that renders a single Zendesk ticket
const ZendeskTicket = function ZendeskTicket(props) {
  const {ticket} = props;

  return (
    <div className="ticket">
      <div className="id">{ticket.id}</div>
      <a href={ticket.url}>{ticket.subject}</a> - {ticket.status}
    </div>
  );
}
ZendeskTicket.propTypes = {
  ticket: React.PropTypes.object.isRequired,
};

// Small React component that renders the user's Zendesk profile.
const ZendeskProfile = function ZendeskProfile(props) {
  const {profile} = props;

  // Transform the profile's array of tickets into an array of React <ZendeskTicket> elements
  const ticketElements = _.map(profile.tickets, (ticket) => {
    return <ZendeskTicket key={ticket.id} ticket={ticket} />
  });

  // Remember - this looks like HTML, but it's actually CJSX, which is converted into
  // Coffeescript at transpile-time. We're actually creating a nested tree of Javascript
  // objects here that *represent* the DOM we want.
  return (
    <div className="profile">
      <img className="logo" alt="zendesk logo" src="nylas://zendesk-card/icon.png" />
      <a href={profile.url}>{profile.name}</a>
      <div>{ticketElements}</div>
    </div>
  );
}
ZendeskProfile.propTypes = {
  // This component takes a `profile` object as a prop. Listing props is optional
  // but enables nice React warnings when our expectations aren't met.
  profile: React.PropTypes.object.isRequired,
}

export default class ZendeskCardSection extends React.Component {
  static displayName = 'ZendeskCardSection';

  static containerStyles = {
    order: 10,
  }

  constructor(props) {
    super(props);
    this.state = this._getStateFromStores();
  }

  componentDidMount() {
    // When our component mounts, start listening to the ZendeskUserStore.
    // When the store `triggers`, our `_onChange` method will fire and allow
    // us to replace our state.
    this._unsubscribe = ZendeskUserStore.listen(this._onChange);
  }

  componentWillUnmount() {
    this._unsubscribe();
  }

  _getStateFromStores = () => {
    return {
      profile: ZendeskUserStore.profileForFocusedContact(),
      loading: ZendeskUserStore.loading(),
    };
  }

  // The data vended by the ZendeskUserStore has changed. Calling `setState:`
  // will cause React to re-render our view to reflect the new values.
  _onChange = () => {
    this.setState(this._getStateFromStores())
  }

  _renderInner() {
    // Handle various loading states by returning early
    if (this.state.loading) {
      return (<div className="pending">Loading...</div>);
    }

    if (!this.state.profile) {
      return (<div className="pending">No Matching Profile</div>);
    }

    return (
      <ZendeskProfile profile={this.state.profile} />
    );
  }

  render() {
    return (
      <div className="sidebar-zendesk-profile">
        <h2>Zendesk</h2>
        {this._renderInner()}
      </div>
    );
  }
}
