# BabyLink SillyTavern 导入授权扩展

这个扩展为当前 LINK 手机设备生成 SillyTavern PNG 导入授权密钥。

使用方法：

1. 在 LINK Add 页顶部的钥匙按钮中生成一次性绑定码。
2. 在 SillyTavern 的 Extensions 面板安装本仓库并打开扩展。
3. 输入 QQ 和 LINK 绑定码，点击“生成解锁密钥”。
4. 复制密钥，回到 LINK 顶部钥匙按钮中粘贴并解锁。

本扩展单独发布在 GitHub 仓库：

`https://github.com/babylink-themes/babylink-sillytavern-license`

在 SillyTavern 的 Extensions → Install Extension 中粘贴上面的仓库地址即可安装。LINK 服务端默认允许 `localhost` 和 `127.0.0.1` 上运行的 SillyTavern；如果使用局域网地址，请在服务端配置 `ST_PLUGIN_ALLOWED_ORIGINS`。

密钥只绑定生成绑定码的 QQ 和 LINK 设备。扩展不会读取或上传聊天记录、角色卡内容。
