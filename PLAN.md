# Add members to team chat by email

**What's changing**

Update the "Team Members" panel so the admin invites people by typing their **email address** instead of just a name, and assigns them a role (Coach, Player, or Parent).

**Features**
- The "Add Member" form will have an **email field** and a **name field** (both required)
- Admin picks a role (Coach, Player, Parent) before adding
- When added, a system message appears in the chat: *"Sarah Johnson (sarah@example.com) was added as a Parent"*
- The member's email is stored and shown beneath their name in the members list
- Existing remove functionality stays the same

**Design**
- Email input appears above the name input with a mail icon
- Both fields sit inside a clean card with subtle background
- Member rows now show the email in smaller grey text under the name
- Everything else (role picker, role badges, remove button) stays as-is
