/** @jsx React.DOM */

var ScheduleDetail = React.createClass({
    propTypes: {
        id: React.PropTypes.number.isRequired
    },
    render: function() {
        return <span>Schedule number {this.props.id}</span>;
    }
});
