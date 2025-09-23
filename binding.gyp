{
  "targets": [
    {
      "target_name": "addon",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "sources": [
        "src/main.cpp",
        "src/chromaprint_wrapper.cpp",
        "src/fingerprint_comparator.cpp",
        "src/fingerprint_index.cpp",
        "src/audio_loader.cpp",
        "src/audio_preprocessor.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": [
        "NAPI_CPP_EXCEPTIONS"
      ],
      "libraries": [
        "-lchromaprint",
        "-lsndfile"
      ],
      "conditions": [
        ["OS=='win'", {
          "libraries": [
            "-lchromaprint.lib",
            "-lsndfile.lib"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1
            }
          }
        }],
        ["OS=='mac'", {
          "cflags+": ["-fvisibility=hidden"],
          "cflags_cc!": ["-fno-exceptions"],
          "libraries": [
            "-framework Accelerate"
          ],
          "xcode_settings": {
            "GCC_SYMBOLS_PRIVATE_EXTERN": "YES",
            "CLANG_CXX_LANGUAGE_STANDARD": "c++17",
            "MACOSX_DEPLOYMENT_TARGET": "10.12",
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "OTHER_CPLUSPLUSFLAGS": [
              "-I/opt/homebrew/include",
              "-I/usr/local/include"
            ],
            "OTHER_LDFLAGS": [
              "-L/opt/homebrew/lib",
              "-L/usr/local/lib"
            ]
          }
        }],
        ["OS=='linux'", {
          "cflags_cc": ["-std=c++17"],
          "cflags": [
            "<!@(pkg-config --cflags libchromaprint sndfile)"
          ],
          "ldflags": [
            "<!@(pkg-config --libs libchromaprint sndfile)"
          ]
        }]
      ]
    }
  ]
}