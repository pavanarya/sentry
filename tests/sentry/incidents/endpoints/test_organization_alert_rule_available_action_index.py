from __future__ import absolute_import

from sentry.constants import SentryAppInstallationStatus
from sentry.models import ApiApplication, ApiGrant, Integration, SentryApp, SentryAppInstallation
from sentry.testutils import APITestCase


# TODO MARCOS 9.5 TEST
class OrganizationAlertRuleAvailableActionIndexEndpointTest(APITestCase):
    endpoint = "sentry-api-0-organization-alert-rule-available-actions"

    def setUp(self):
        super(OrganizationAlertRuleAvailableActionIndexEndpointTest, self).setUp()
        self.login_as(self.user)

    def create_integration_response(self, type, integration=None):
        allowed_target_types = {
            "email": ["user", "team"],
            "integration": [],
        }.get(type, ["specific"])

        return {
            "type": type,
            "allowedTargetTypes": allowed_target_types,
            "integrationName": integration.name if integration else None,
            "integrationId": integration.id if integration else None,
            "inputType": "select" if type in ["pagerduty", "email"] else "text",
        }

    def test_no_integrations(self):
        with self.feature("organizations:incidents"):
            resp = self.get_valid_response(self.organization.slug)

        assert resp.data == [self.create_integration_response("email")]

    def test_simple(self):
        integration = Integration.objects.create(external_id="1", provider="slack")
        integration.add_organization(self.organization)

        with self.feature("organizations:incidents"):
            resp = self.get_valid_response(self.organization.slug)

        assert resp.data == [
            self.create_integration_response("email"),
            self.create_integration_response("slack", integration),
        ]

    def test_duplicate_integrations(self):
        integration = Integration.objects.create(external_id="1", provider="slack", name="slack 1")
        integration.add_organization(self.organization)
        other_integration = Integration.objects.create(
            external_id="2", provider="slack", name="slack 2"
        )
        other_integration.add_organization(self.organization)

        with self.feature("organizations:incidents"):
            resp = self.get_valid_response(self.organization.slug)

        assert resp.data == [
            self.create_integration_response("email"),
            self.create_integration_response("slack", integration),
            self.create_integration_response("slack", other_integration),
        ]

    def test_no_feature(self):
        self.create_team(organization=self.organization, members=[self.user])
        resp = self.get_response(self.organization.slug)
        assert resp.status_code == 404

    def test_sentry_apps(self):
        sentry_app = self.create_sentry_app(name="foo", organization=self.organization, is_alertable=True)
        self.create_sentry_app_installation(slug=sentry_app.slug, organization=self.organization, user=self.user)

        with self.feature([
            "organizations:incidents",
            "organizations:integrations-metric-alerts-support",
        ]):
            resp = self.get_valid_response(self.organization.slug)

        assert resp.data == [
            self.create_integration_response("email"),
            self.create_integration_response("integration", sentry_app),
        ]
