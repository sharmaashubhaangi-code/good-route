const {
    CedarInlineAuthorizationEngine
} = require("@cedar-policy/cedar-authorization");

const schema = JSON.stringify({
    GoodRoute: {
        entityTypes: {
            User: {
                shape: {
                    type: "Record",
                    attributes: {}
                }
            },

            RoadReport: {
                shape: {
                    type: "Record",
                    attributes: {}
                }
            }
        },

        actions: {
            CreateReport: {
                appliesTo: {
                    principalTypes: ["User"],
                    resourceTypes: ["RoadReport"]
                }
            }
        }
    }
});

const policy = `
permit (
    principal,
    action == GoodRoute::Action::"CreateReport",
    resource
);
`;

const cedar = new CedarInlineAuthorizationEngine({
    staticPolicies: policy,
    schema: {
        type: "jsonString",
        schema
    }
});

async function canCreateReport() {
    const result = await cedar.isAuthorized(
        {
            principal: {
                type: "GoodRoute::User",
                id: "public-user"
            },

            action: {
                type: "GoodRoute::Action",
                id: "CreateReport"
            },

            resource: {
                type: "GoodRoute::RoadReport",
                id: "new-report"
            },

            context: {}
        },

        [
            {
                uid: {
                    type: "GoodRoute::User",
                    id: "public-user"
                },
                attrs: {},
                parents: []
            },

            {
                uid: {
                    type: "GoodRoute::RoadReport",
                    id: "new-report"
                },
                attrs: {},
                parents: []
            }
        ]
    );

    return result.type === "allow";
}

module.exports = { canCreateReport };