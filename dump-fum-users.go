package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
)

var opts = &struct {
	outFilename string
	accessToken string
}{}

func init() {
	flag.Usage = func() {
		fmt.Fprintln(os.Stderr, "Usage: dump [options] accessToken")
		flag.PrintDefaults()
	}
	flag.StringVar(&opts.outFilename, "o", "-",
		"Output file, or ‘-’ for stdout")
	flag.Parse()
	posArgs := flag.Args()
	if len(posArgs) != 1 {
		log.Fatal("Expect 1 positional arg, got", len(posArgs))
	}
	opts.accessToken = posArgs[0]
}

func main() {
	var out io.Writer = os.Stdout
	if opts.outFilename != "-" {
		file, err := os.Create(opts.outFilename)
		if err != nil {
			log.Fatal(err)
		}
		defer file.Close()
		out = file
	}
	writeUsers(getUsers(opts.accessToken), out)
}

func getUsers(accTok string) []interface{} {
	var result []interface{}
	url := "https://api.fum.futurice.com/users/" +
		"?fields=id,username,email,first_name,last_name," +
		"google_status,status,supervisor"

	for url != "" {
		func() {
			log.Println("Getting", url)
			client := &http.Client{}
			req, err := http.NewRequest("GET", url, nil)
			if err != nil {
				log.Fatal(err)
			}
			req.Header.Add("Authorization", "Token "+accTok)
			resp, err := client.Do(req)
			if err != nil {
				log.Fatal(err)
			}
			defer resp.Body.Close()

			var data interface{}
			err = json.NewDecoder(resp.Body).Decode(&data)
			if err != nil {
				log.Fatal(err)
			}

			dataMap := data.(map[string]interface{})
			if dataMap["next"] == nil {
				url = ""
			} else {
				url = dataMap["next"].(string)
			}

			result = append(result,
				dataMap["results"].([]interface{})...)
		}()
	}
	return result
}

func writeUsers(users []interface{}, out io.Writer) {
	err := json.NewEncoder(out).Encode(users)
	if err != nil {
		log.Fatal(err)
	}
}
