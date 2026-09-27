# BabyLink SillyTavern 导入授权扩展

这个扩展用于为当前 SillyTavern 实例生成 BabyLink 角色卡导入授权密钥。

使用方法：

1. 在 LINK 的 SillyTavern 导入授权面板中生成一次性设备绑定码。
2. 在 SillyTavern 的 Extensions 面板安装本仓库并展开 BabyLink 授权面板。
3. QQ 用户可填写 QQ 号；Discord 登录用户可以留空，也可以填写 dc_ 开头的账号标识，然后输入绑定码。
4. 复制密钥，回到 LINK 页面粘贴并激活。

在 SillyTavern 的 Extensions → Install Extension 中粘贴仓库地址即可安装。LINK 默认允许 localhost、127.0.0.1、HTTPS、TauriTavern 和云服务器场景；如使用自定义局域网来源，请在服务器配置 ST_PLUGIN_ALLOWED_ORIGINS。

密钥只绑定一次性绑定码对应的 LINK 账号和设备。扩展不会读取或上传聊天记录、角色卡内容或其他 SillyTavern 数据。授权是永久设备授权，除非用户在 LINK 中主动撤销。
