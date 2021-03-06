# Typical Reply

Provides ability to send/receive typical replies in a team.

For example, if you are reading a mail like:

    Subject:
      How about this?
    
    Body:
      Hi.
      I've wrote a plan. How about this?
      http://...

Then you can send a typical reply quickly.
If you click the "Like!" button (or choose "Like!" item from the context menu on the thread pane), a reply like follogin will be sent:

    Subject:
      [[Like!]]: Re: How about this?
    
    Body:
      Like!
      
      > Hi.
      > I've wrote a plan. How about this?
      > http://...

On the other hand, when the receiver downloads typical reply mails, those replies are shown with special icon for the type.
Moreover the receiver can see all received typical replies via a virtual folder created by this addon automatically.

There are three types of "typical reply" are defined by default: "accept", "reject", and "like".
Of course you can add new types of typical replies as you like.


## How to add a new typical reply type?

For example, assume that you are going to add a new "Awesome!" button.

 1. Define the internal type name. Now I use `awesome`.
 2. Define name of the reply type. It must be defined as a object in an array under the key "buttons" in the managed storage for WebExtensions, like:
    
        "buttons": [
          {
            "id":        "awesome",
            "label":     "Awesome!",
            "accesskey": "A"
          }
        ]
    
    For legacy versions, it must be a string preference like:
    
        pref("extensions.typical-reply@clear-code.com.reply.awesome.label",     "Awesome!");
        pref("extensions.typical-reply@clear-code.com.reply.awesome.accesskey", "A");
        // The part `extensions.typical-reply@clear-code.com.reply.` is the common prefix.
    
    The `label` is used for the custom button or the menu item of the "Tipycal Reply" button.
    The `accesskey` is used for the menu item in the menu of the "Tipycal Reply" button.
 3. Define subject of typical replies from the button.
    
    Managed storage for WebExtensions:
    
        "buttons": [
          {
            "id":            "awesome",
            ...
            "subjectPrefix": "[[Awesome!]]",
            "subject":       ""
          }
        ]
    
    Legacy style:
    
        pref("extensions.typical-reply@clear-code.com.reply.awesome.subjectPrefix", "[[Awesome!]]");
        pref("extensions.typical-reply@clear-code.com.reply.awesome.subject",       "");
    
    If you set any string for the `subjectPrefix`, it will be inserted to the start of the subject.
    It will be used to detect the type of the reply.
    If a receiver gets a mail with a subject like "[[Awesome!]]: Re: How about this?", its reply type will be detected as "awesome".
    
    If you use another option `subject`, the subject of the reply will be completely replaced to the value of `subject`.
 4. Define body of typical replies from the button.
    
    Managed storage for WebExtensions:
    
        "buttons": [
          {
            "id":   "awesome",
            ...
            "body": "Awesome!!"
          }
        ]
    
    Legacy style:
    
        pref("extensions.typical-reply@clear-code.com.reply.awesome.body", "Awesome!!");
    
    It will be inserted to the body of the reply automatically.
 5. Define recipients of the typical reply.
    There are some choices:
    
    * `all`: Same to "Reply to All". The reply inherits To, Cc, and Bcc from the original mail.
    * `sender`: Same to "Reply to Sender". The reply will be sent to the author of the original mail.
    * `blank`: The list of recipients will become blank completely.
    * Array of E-mail addresses
    
    For example:
     
    Managed storage for WebExtensions:
    
        "buttons": [
          {
            "id":         "awesome",
            ...
            "recipients": "all" // "sender", "blank", or ["user@example.com", ...]
          }
        ]
    
    Legacy style:
    
        pref("extensions.typical-reply@clear-code.com.reply.awesome.recipients", "all");
        // "sender", "blank", or "user@example.com, ..."
    
 6. Define forwarding behavior.
     
    Managed storage for WebExtensions:
    
        "buttons": [
          {
            "id":          "awesome",
            ...
            "forwardType": "attachment"
          }
        ]
    
    Legacy style:
    
        pref("extensions.typical-reply@clear-code.com.reply.awesome.forwardType", "attachment");
    
    Acceptable values are `"attachment"` (always forward as an attachment) or `"inline"` (always forward inline). In these cases you need to specify E-mail addresses via the `recipients` parameter previously described, in other words both `all` and `sender` are ignored.
    
    If you want to send a reply from the button, don't specify any value for this parameter.
 7. Define quotation behavior.
     
    Managed storage for WebExtensions:
    
        "buttons": [
          {
            "id":        "awesome",
            ...
            "quoteType": "yes"
          }
        ]
    
    Legacy style:
    
        pref("extensions.typical-reply@clear-code.com.reply.awesome.quoteType", "yes");
    
    Acceptable values are `"yes"` (always quote body) or `"no"` (never qupte body). Otherwise the button for the type will have two choices: "reply without quote" and "reply with quote".
 8. Define the priority (available only on legacy versions, not available on WebExtensions version).
    Possible values are `Highest`, `High`, `Normal`, `Low` and `Lowest`.
     
        pref("extensions.typical-reply@clear-code.com.reply.awesome.priority", "Highest");
    
 9. Define button type (available only on legacy versions, not available on WebExtensions version).
    
        pref("extensions.typical-reply@clear-code.com.reply.awesome.separate", false);
    
    If you choose `true`, a new toolbar button for the reply type is generated in the header area.
    Otherwise menu items for the reply type is generated in the menu item of the "Tipycal Reply" button.
 10. Define behavior of the virtual folder. (available only on legacy versions, not available on WebExtensions version).
     
         pref("extensions.typical-reply@clear-code.com.reply.awesome.searchFolder",  true);
         pref("extensions.typical-reply@clear-code.com.reply.awesome.searchTargets", "all");
    
     If you set `searchFolder` to `true`, this addon automatically generates a virutal folder for the type, in all accounts.
     You can customize list of folders which via the preference item `searchTargets`.
     
     * `all`: Finds all typical reply messages from all folders of the account.
     * `inbox`: Finxs typical reply messges only from the inbox.
     
 11. Define allowed recipient domains.
     
    Managed storage for WebExtensions:
    
        "buttons": [
          {
            "id":             "awesome",
            ...
            "allowedDomains": "*" // or ["example.com", ...]
          }
        ]
    
    Legacy style:
    
         pref("extensions.typical-reply@clear-code.com.reply.awesome.allowedDomains", "*");
         // or "example.com, ..."
     
     If you set `allowedDomains` to `*` or a blank string, then typical replies can be sent
     for any recipient.
     Otherwise - if you write a list of domains, then you can send typical replies
     only when all recipients are included in the list.
 12. Define behaviour of auto-send. (available only on legacy versions, not available on WebExtensions version).
     
         pref("extensions.typical-reply@clear-code.com.reply.awesome.autoSend", "noquote");
     
     If you set `autoSend` to `always`, then typical replies are sent to recipients automatically
     without confirmation. If you set it to `noquote`, then typical replies are sent automatically
     only when there is no quotation in the body. Otherwise, you have to click the "Send" button
     manually.
 13. Define images for the type.
     You can specify images as an URI.
     
    Managed storage for WebExtensions:
    
        "buttons": [
          {
            "id":        "awesome",
            ...
            "icon":      "data:image/png,...",
            "bodyImage": "data:image/png,..."
          }
        ]
    
    Legacy style:
    
         pref("extensions.typical-reply@clear-code.com.reply.awesome.icon",      "data:image/png,...");
         pref("extensions.typical-reply@clear-code.com.reply.awesome.bodyImage", "data:image/png,...");
     
     The `icon` is used for the button and menu items of the "Tipycal Reply" button.
     If you set any URI fo the `bodyImage`, it will be embedded to the message, as an attachment.

Finally you'll get a configurations for the new button, like following:

Managed storage for WebExtensions:

```javascript
"buttons": [
  {
    "id":             "awesome",
    "label":          "Awesome!",
    "accesskey":      "L",
    "subjectPrefix":  "[[!Awesome]]",
    "subject":        "",
    "body":           "Awesome!",
    "recipients":     "all",
    "forwardType":    "",
    "quoteType":      "",
    "allowedDomains": "*",
    "icon":           "data:image/png,...(awesome.png)...",
    "bodyImage":      "data:image/png,...(awesome.png)..."
  }
]
```

Legacy style:

```javascript
pref("extensions.typical-reply@clear-code.com.reply.awesome.label",         "Awesome!");
pref("extensions.typical-reply@clear-code.com.reply.awesome.accesskey",     "L");
pref("extensions.typical-reply@clear-code.com.reply.awesome.subjectPrefix", "[[!Awesome]]");
pref("extensions.typical-reply@clear-code.com.reply.awesome.subject",       "");
pref("extensions.typical-reply@clear-code.com.reply.awesome.body",          "Awesome!");
pref("extensions.typical-reply@clear-code.com.reply.awesome.recipients",    "all");
pref("extensions.typical-reply@clear-code.com.reply.awesome.forwardType",   "");
pref("extensions.typical-reply@clear-code.com.reply.awesome.quoteType",     "");
pref("extensions.typical-reply@clear-code.com.reply.awesome.priority",      "");
pref("extensions.typical-reply@clear-code.com.reply.awesome.separate",      false);
pref("extensions.typical-reply@clear-code.com.reply.awesome.searchFolder",  true);
pref("extensions.typical-reply@clear-code.com.reply.awesome.searchTargets", "all");
pref("extensions.typical-reply@clear-code.com.reply.awesome.allowedDomains", "*");
pref("extensions.typical-reply@clear-code.com.reply.awesome.autoSend",      "noquote");
pref("extensions.typical-reply@clear-code.com.reply.awesome.icon",          "data:image/png,...(awesome.png)...");
pref("extensions.typical-reply@clear-code.com.reply.awesome.bodyImage",     "data:image/png,...(awesome.png)...");
```

Then you have to add the internal name of the type you defined for legacy versions, like:

```javascript
pref("extensions.typical-reply@clear-code.com.buttons", "accept,reject,like,awesome");
```

## More examples

### "Report as abuse" button

Managed storage for WebExtensions:

```javascript
"buttons": [
  {
    "id":             "abuse",
    "label":          "Report as Abuse Mail",
    "accesskey":      "R",
    "subjectPrefix":  "[[!Awesome]]",
    "subject":        "",
    "body":           "This is an abuse mail.",
    "recipients":     ["report-abuse@example.com"],
    "forwardType":    "attachment",
    "quoteType":      "no",
    "allowedDomains": "*"
  }
]
```

Legacy style:

```javascript
pref("extensions.typical-reply@clear-code.com.reply.abuse.label",          "Report as Abuse Mail");
pref("extensions.typical-reply@clear-code.com.reply.abuse.accesskey",      "R");
pref("extensions.typical-reply@clear-code.com.reply.abuse.subjectPrefix",  "[[Abuse]]");
pref("extensions.typical-reply@clear-code.com.reply.abuse.subject",        "");
pref("extensions.typical-reply@clear-code.com.reply.abuse.body",           "This is an abuse mail.");
pref("extensions.typical-reply@clear-code.com.reply.abuse.recipients",     "report-abuse@example.com");
pref("extensions.typical-reply@clear-code.com.reply.abuse.quoteType",      "no");
pref("extensions.typical-reply@clear-code.com.reply.abuse.forwardType",    "attachment");
pref("extensions.typical-reply@clear-code.com.reply.abuse.separate",       true);
pref("extensions.typical-reply@clear-code.com.reply.abuse.allowedDomains", "*");
```
