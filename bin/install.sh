rsync -avz --no-perms --no-owner --no-group \
  ./ vpn:/var/app/vpn-client \
  --exclude .git \
  --exclude /build \
  --exclude /node_modules \
  --exclude /platforms \
  --exclude /plugins \
  --exclude /app.apk \
  --exclude .gredle \
  --exclude /src/cordova/android/OutlineAndroidLib/outline/build \
  --exclude /www &&
ssh vpn -t  'source ~/.zshrc; exec zsh -c "cd /var/app/vpn-client; npm install; /var/app/vpn-client/release"' &&
wget -O app.apk http://213.226.127.182/universal.apk &&
adb install app.apk