"""Configure la signature de release dans android/app/build.gradle (généré par expo prebuild).
Les identifiants sont lus dans les variables d'environnement KEYSTORE_PATH, SIGN_STORE_PASSWORD, SIGN_KEY_ALIAS, SIGN_KEY_PASSWORD."""
import sys
path = sys.argv[1]
s = open(path).read()

release_cfg = """
        release {
            storeFile file(System.getenv('KEYSTORE_PATH'))
            storePassword System.getenv('SIGN_STORE_PASSWORD')
            keyAlias System.getenv('SIGN_KEY_ALIAS')
            keyPassword System.getenv('SIGN_KEY_PASSWORD')
        }"""
if "signingConfigs {" not in s:
    sys.exit("signingConfigs introuvable")
s = s.replace("signingConfigs {", "signingConfigs {" + release_cfg, 1)

# dans buildTypes > release, remplacer la signature debug par la signature release
i = s.index("buildTypes {")
j = s.index("release {", i)
k = s.index("signingConfig signingConfigs.debug", j)
s = s[:k] + "signingConfig signingConfigs.release" + s[k + len("signingConfig signingConfigs.debug"):]
open(path, "w").write(s)
print("signature release configurée")
