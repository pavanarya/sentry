from __future__ import absolute_import

import six

from sentry.api.serializers import register, Serializer
from sentry.incidents.models import AlertRuleTriggerAction


@register(AlertRuleTriggerAction)
class AlertRuleTriggerActionSerializer(Serializer):
    def human_desc(self, action):
        # Returns a human readable description to display in the UI
        if action.type == action.Type.EMAIL.value:
            if action.target:
                if action.target_type == action.TargetType.USER.value:
                    return "Send an email to " + action.target.email
                elif action.target_type == action.TargetType.TEAM.value:
                    return "Send an email to members of #" + action.target.slug
        elif action.type == action.Type.PAGERDUTY.value:
            return "Send a PagerDuty notification to " + action.target_display
        elif action.type == action.Type.SLACK.value:
            return "Send a Slack notification to " + action.target_display
        elif action.type == action.Type.MSTEAMS.value:
            return "Send a Microsoft Teams notification to " + action.target_display
        elif action.type == action.Type.INTEGRATION.value:
            return "Send a Internal Integration notification to " + action.target_display

    def get_identifier_from_action(self, action):
        target_identifier = (
            action.target_display if action.target_display is not None else action.target_identifier
        )
        if action.type == action.Type.PAGERDUTY.value:
            target_identifier = int(action.target_identifier)

        return target_identifier

    def serialize(self, obj, attrs, user):
        from sentry.incidents.endpoints.serializers import action_target_type_to_string

        return {
            "id": six.text_type(obj.id),
            "alertRuleTriggerId": six.text_type(obj.alert_rule_trigger_id),
            "type": AlertRuleTriggerAction.get_registered_type(
                AlertRuleTriggerAction.Type(obj.type)
            ).slug,
            "targetType": action_target_type_to_string[
                AlertRuleTriggerAction.TargetType(obj.target_type)
            ],
            "targetIdentifier": self.get_identifier_from_action(obj),
            "integrationId": obj.integration_id,
            "dateCreated": obj.date_added,
            "desc": self.human_desc(obj),
        }
