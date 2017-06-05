from requests.auth import AuthBase

### This file is copied from https://github.com/futurice/sso-frontend

class TokenAuth(AuthBase): # pragma: no cover
    def __init__(self, token):
        self.token = token

    def __call__(self, r):
        r.headers['Authorization'] = 'Token %s'%self.token
        return r

