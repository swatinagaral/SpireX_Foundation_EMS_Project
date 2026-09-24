const permissions = {
  super_admin: [
    "*",
  ],

  admin: [
    "announcements.create",
    "announcements.read",
    "announcements.update",
    "announcements.delete",

    "emails.send",
    "emails.bulk",
    "emails.template",
    "emails.history",

    "reports.view",
    "reports.export",
  ],

  hr: [
    "announcements.create",
    "announcements.read",
    "announcements.update",

    "emails.send",
    "emails.template",
    "emails.history",

    "reports.view",
    "reports.export",
  ],

  coordinator: [
    "announcements.create",
    "announcements.read",
    "announcements.update",

    "emails.send",
    "emails.bulk",

    "reports.view",
  ],

  employee: [
    "announcements.read",
    "reports.view",
  ],

  student: [
    "announcements.read",
  ],
};

module.exports = permissions;