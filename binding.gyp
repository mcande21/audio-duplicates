{
  "targets": [
    {
      "target_name": "addon",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "cflags": [ "-fopenmp" ],
      "cflags_cc": [ "-fopenmp" ],
      "sources": [
        "src/main.cpp",
        "src/chromaprint_wrapper.cpp",
        "src/fingerprint_comparator.cpp",
        "src/fingerprint_index.cpp",
        "src/audio_loader.cpp",
        "src/audio_preprocessor.cpp",
        "src/compressed_fingerprint.cpp",
        "src/audio_memory_pool.cpp",
        "src/streaming_audio_loader.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": [
        "NAPI_CPP_EXCEPTIONS"
      ],
      "libraries": [
        "-lchromaprint",
        "-lsndfile",
        "-lmimalloc",
        "-llz4"
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
          "cflags_cc+": ["-fopenmp"],
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
              "-I/usr/local/include",
              "-I/opt/homebrew/opt/libomp/include"
            ],
            "OTHER_LDFLAGS": [
              "-L/opt/homebrew/lib",
              "-L/usr/local/lib",
              "-L/opt/homebrew/opt/libomp/lib",
              "-lomp",
              "-lmimalloc",
              "-llz4"
            ]
          }
        }],
        ["OS=='linux'", {
          "cflags_cc": ["-std=c++17", "-fopenmp"],
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